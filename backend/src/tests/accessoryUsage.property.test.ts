/**
 * Property-Based Tests for Accessory Usage Service
 * Feature: printer-accessories
 *
 * Property 7: 使用记录更新数量和状态
 * Property 8: 使用历史完整性
 *
 * Validates: Requirements 6.2, 6.3, 6.4
 */

import * as fc from 'fast-check';
import { AccessoryService } from '../services/accessory.service';
import { AccessoryCategoryService } from '../services/accessoryCategory.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating accessory names
const accessoryNameArb = fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5]{2,30}$/);

// Arbitrary for generating dates
const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});

// Arbitrary for generating optional purpose
const optionalPurposeArb = fc.option(fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5 .,!?]{5,100}$/), {
  nil: undefined,
});

// Helper to create a test user
async function createTestUser(): Promise<{ userId: string; email: string }> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  return { userId: result.user.id, email };
}

// Helper to get a preset category
async function getPresetCategory(): Promise<string> {
  const categories = await AccessoryCategoryService.getPresetCategories();
  return categories[0].id;
}

describe('Property 7: 使用记录更新数量和状态', () => {
  /**
   * Property: After recording usage, remaining quantity should equal
   * original quantity minus usage quantity, and status should be 'depleted' when remaining is 0.
   */
  it('should update remaining quantity after usage', async () => {
    await fc.assert(
      fc.asyncProperty(
        accessoryNameArb,
        fc.integer({ min: 5, max: 20 }),
        fc.integer({ min: 1, max: 4 }),
        dateArb,
        optionalPurposeArb,
        async (name, initialQty, usageQty, usageDate, purpose) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();

          // Create accessory with initial quantity
          const accessory = await AccessoryService.create(userId, {
            categoryId,
            name,
            quantity: initialQty,
          });

          expect(accessory.remainingQty).toBe(initialQty);

          // Record usage
          const updated = await AccessoryService.recordUsage(userId, accessory.id, {
            usageDate,
            quantity: usageQty,
            purpose,
          });

          // Verify remaining quantity
          expect(updated.remainingQty).toBe(initialQty - usageQty);
          expect(updated.status).toBe('available');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should set status to depleted when remaining is 0', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessory with quantity 5
    const accessory = await AccessoryService.create(userId, {
      categoryId,
      name: 'Test Accessory',
      quantity: 5,
    });

    // Use all quantity
    const updated = await AccessoryService.recordUsage(userId, accessory.id, {
      usageDate: new Date(),
      quantity: 5,
    });

    expect(updated.remainingQty).toBe(0);
    expect(updated.status).toBe('depleted');
  });

  it('should set status to low_stock when below threshold', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessory with quantity 10 and threshold 3
    const accessory = await AccessoryService.create(userId, {
      categoryId,
      name: 'Test Accessory',
      quantity: 10,
      lowStockThreshold: 3,
    });

    // Use 8, leaving 2 (below threshold)
    const updated = await AccessoryService.recordUsage(userId, accessory.id, {
      usageDate: new Date(),
      quantity: 8,
    });

    expect(updated.remainingQty).toBe(2);
    expect(updated.status).toBe('low_stock');
  });

  it('should reject usage exceeding remaining quantity', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessory with quantity 5
    const accessory = await AccessoryService.create(userId, {
      categoryId,
      name: 'Test Accessory',
      quantity: 5,
    });

    // Attempt to use more than available
    await expect(
      AccessoryService.recordUsage(userId, accessory.id, {
        usageDate: new Date(),
        quantity: 10,
      })
    ).rejects.toThrow('Usage quantity exceeds remaining');
  });
});

describe('Property 8: 使用历史完整性', () => {
  /**
   * Property: When querying accessory details, all usage records should be included.
   */
  it('should include all usage records in accessory details', async () => {
    await fc.assert(
      fc.asyncProperty(
        accessoryNameArb,
        fc.array(fc.tuple(dateArb, fc.integer({ min: 1, max: 2 }), optionalPurposeArb), {
          minLength: 1,
          maxLength: 5,
        }),
        async (name, usageData) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();

          // Calculate total usage to ensure we have enough quantity
          const totalUsage = usageData.reduce((sum, [, qty]) => sum + qty, 0);

          // Create accessory with enough quantity
          const accessory = await AccessoryService.create(userId, {
            categoryId,
            name,
            quantity: totalUsage + 10,
          });

          // Record multiple usages
          for (const [usageDate, quantity, purpose] of usageData) {
            await AccessoryService.recordUsage(userId, accessory.id, {
              usageDate,
              quantity,
              purpose,
            });
          }

          // Get accessory details
          const details = await AccessoryService.findById(userId, accessory.id);

          // Verify all usage records are included
          expect(details.usageRecords).toBeDefined();
          expect(details.usageRecords?.length).toBe(usageData.length);

          // Verify remaining quantity
          expect(details.remainingQty).toBe(totalUsage + 10 - totalUsage);
        }
      ),
      { numRuns: 50 }
    );
  });
});
