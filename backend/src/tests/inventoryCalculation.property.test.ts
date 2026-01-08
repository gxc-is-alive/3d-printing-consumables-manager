/**
 * Property-Based Tests for Inventory Calculation Consistency
 * Feature: 3d-printing-consumables-manager, Property 4: Inventory Calculation Consistency
 * Validates: Requirements 5.1, 5.3, 5.4
 *
 * Property: For any Consumable with initial weight W, after N usage records totaling U grams,
 * the remaining weight should equal W - U (or 0 if U > W).
 */

import * as fc from 'fast-check';
import { ConsumableService } from '../services/consumable.service';
import { UsageRecordService } from '../services/usageRecord.service';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating positive weight (in grams)
const positiveWeightArb = fc.float({ min: 500, max: 2000, noNaN: true });

// Arbitrary for generating usage amounts (smaller than typical weight)
const usageAmountArb = fc.float({ min: 10, max: 200, noNaN: true });

// Arbitrary for generating usage date
const usageDateArb = fc.date({
  min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  max: new Date(),
});

// Helper to create a test user with brand, type, and consumable
async function createTestUserWithConsumable(initialWeight: number): Promise<{
  userId: string;
  consumableId: string;
  initialWeight: number;
}> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  const userId = result.user.id;

  // Create a brand for the user
  const brand = await BrandService.create(userId, {
    name: `TestBrand${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  // Create a consumable type for the user
  const type = await ConsumableTypeService.create(userId, {
    name: `TestType${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  // Create a consumable
  const consumable = await ConsumableService.create(userId, {
    brandId: brand.id,
    typeId: type.id,
    color: 'White',
    weight: initialWeight,
    price: 100,
    purchaseDate: new Date(),
  });

  return { userId, consumableId: consumable.id, initialWeight };
}

describe('Property 4: Inventory Calculation Consistency', () => {
  /**
   * Property: For any consumable with initial weight W, after creating a single usage record
   * with amount U, the remaining weight should equal max(0, W - U).
   */
  it('should correctly calculate remaining weight after single usage', async () => {
    await fc.assert(
      fc.asyncProperty(
        positiveWeightArb,
        usageAmountArb,
        usageDateArb,
        async (initialWeight, usageAmount, usageDate) => {
          const { userId, consumableId } = await createTestUserWithConsumable(initialWeight);

          // Create usage record
          await UsageRecordService.create(userId, {
            consumableId,
            amountUsed: usageAmount,
            usageDate,
          });

          // Retrieve consumable and verify remaining weight
          const consumable = await ConsumableService.findById(userId, consumableId);
          const expectedRemaining = Math.max(0, initialWeight - usageAmount);

          expect(consumable.remainingWeight).toBeCloseTo(expectedRemaining, 2);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For any consumable with initial weight W, after N usage records totaling U grams,
   * the remaining weight should equal max(0, W - U).
   */
  it('should correctly calculate remaining weight after multiple usages', async () => {
    await fc.assert(
      fc.asyncProperty(
        positiveWeightArb,
        fc.array(usageAmountArb, { minLength: 1, maxLength: 3 }),
        async (initialWeight, usageAmounts) => {
          const { userId, consumableId } = await createTestUserWithConsumable(initialWeight);

          // Create multiple usage records
          for (const amount of usageAmounts) {
            await UsageRecordService.create(userId, {
              consumableId,
              amountUsed: amount,
              usageDate: new Date(),
            });
          }

          // Calculate total usage
          const totalUsage = usageAmounts.reduce((sum, amt) => sum + amt, 0);
          const expectedRemaining = Math.max(0, initialWeight - totalUsage);

          // Retrieve consumable and verify remaining weight
          const consumable = await ConsumableService.findById(userId, consumableId);

          expect(consumable.remainingWeight).toBeCloseTo(expectedRemaining, 2);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Deleting a usage record should restore the inventory correctly.
   * After creating usage U and then deleting it, remaining weight should be restored
   * (but not exceed original weight).
   */
  it('should restore inventory when usage record is deleted', async () => {
    await fc.assert(
      fc.asyncProperty(positiveWeightArb, usageAmountArb, async (initialWeight, usageAmount) => {
        const {
          userId,
          consumableId,
          initialWeight: weight,
        } = await createTestUserWithConsumable(initialWeight);

        // Create usage record
        const { record } = await UsageRecordService.create(userId, {
          consumableId,
          amountUsed: usageAmount,
          usageDate: new Date(),
        });

        // Verify weight was deducted
        let consumable = await ConsumableService.findById(userId, consumableId);
        const afterUsageWeight = Math.max(0, weight - usageAmount);
        expect(consumable.remainingWeight).toBeCloseTo(afterUsageWeight, 2);

        // Delete usage record
        await UsageRecordService.delete(userId, record.id);

        // Verify weight was restored (but not exceeding original)
        consumable = await ConsumableService.findById(userId, consumableId);
        const expectedRestored = Math.min(weight, afterUsageWeight + usageAmount);
        expect(consumable.remainingWeight).toBeCloseTo(expectedRestored, 2);
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Updating a usage record should correctly recalculate inventory.
   * If usage is changed from U1 to U2, remaining weight should adjust by (U1 - U2).
   */
  it('should correctly recalculate inventory when usage record is updated', async () => {
    await fc.assert(
      fc.asyncProperty(
        positiveWeightArb,
        usageAmountArb,
        usageAmountArb,
        async (initialWeight, originalUsage, updatedUsage) => {
          const {
            userId,
            consumableId,
            initialWeight: weight,
          } = await createTestUserWithConsumable(initialWeight);

          // Create usage record with original amount
          const { record } = await UsageRecordService.create(userId, {
            consumableId,
            amountUsed: originalUsage,
            usageDate: new Date(),
          });

          // Update usage record with new amount
          await UsageRecordService.update(userId, record.id, {
            amountUsed: updatedUsage,
          });

          // Verify remaining weight is correctly calculated
          const consumable = await ConsumableService.findById(userId, consumableId);
          const expectedRemaining = Math.max(0, weight - updatedUsage);

          expect(consumable.remainingWeight).toBeCloseTo(expectedRemaining, 2);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: When usage exceeds remaining inventory, remaining weight should be 0
   * and a warning should be returned.
   */
  it('should handle usage exceeding inventory with warning and zero remaining', async () => {
    await fc.assert(
      fc.asyncProperty(positiveWeightArb, async (initialWeight) => {
        const { userId, consumableId } = await createTestUserWithConsumable(initialWeight);

        // Create usage that exceeds initial weight
        const excessiveUsage = initialWeight + 100;
        const { warning } = await UsageRecordService.create(userId, {
          consumableId,
          amountUsed: excessiveUsage,
          usageDate: new Date(),
        });

        // Verify warning was returned
        expect(warning).toBeDefined();
        expect(warning).toContain('exceeds remaining inventory');

        // Verify remaining weight is 0 (not negative)
        const consumable = await ConsumableService.findById(userId, consumableId);
        expect(consumable.remainingWeight).toBe(0);
      }),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Total usage calculated from records should match the difference
   * between initial weight and remaining weight.
   */
  it('should have consistent total usage calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        positiveWeightArb,
        fc.array(usageAmountArb, { minLength: 1, maxLength: 2 }),
        async (initialWeight, usageAmounts) => {
          const {
            userId,
            consumableId,
            initialWeight: weight,
          } = await createTestUserWithConsumable(initialWeight);

          // Create multiple usage records
          for (const amount of usageAmounts) {
            await UsageRecordService.create(userId, {
              consumableId,
              amountUsed: amount,
              usageDate: new Date(),
            });
          }

          // Get total usage from service
          const totalUsage = await UsageRecordService.getTotalUsageForConsumable(
            userId,
            consumableId
          );

          // Get consumable remaining weight
          const consumable = await ConsumableService.findById(userId, consumableId);

          // Verify consistency: initial - remaining should equal total usage (when no overflow)
          const actualUsedFromWeight = weight - consumable.remainingWeight;
          const expectedTotalUsage = usageAmounts.reduce((sum, amt) => sum + amt, 0);

          expect(totalUsage).toBeCloseTo(expectedTotalUsage, 2);

          // If total usage <= initial weight, the difference should match
          if (expectedTotalUsage <= weight) {
            expect(actualUsedFromWeight).toBeCloseTo(totalUsage, 2);
          } else {
            // If overflow, remaining should be 0
            expect(consumable.remainingWeight).toBe(0);
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
