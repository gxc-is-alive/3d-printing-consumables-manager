/**
 * Property-Based Tests for Aggregation Calculation Correctness
 * Feature: 3d-printing-consumables-manager, Property 7: Aggregation Calculation Correctness
 * Validates: Requirements 4.5, 7.1, 7.3
 *
 * Property: For any set of consumables, the total weight per category (brand/type/color)
 * should equal the sum of individual remaining weights in that category.
 */

import * as fc from 'fast-check';
import { DashboardService } from '../services/dashboard.service';
import { ConsumableService } from '../services/consumable.service';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating positive weight (in grams)
const positiveWeightArb = fc.float({ min: 100, max: 2000, noNaN: true });

// Arbitrary for generating price
const priceArb = fc.float({ min: 10, max: 500, noNaN: true });

// Arbitrary for generating color names
const colorArb = fc.constantFrom('White', 'Black', 'Red', 'Blue', 'Green', 'Yellow');

// Helper to create a test user
async function createTestUser(): Promise<string> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  return result.user.id;
}

// Helper to create a brand for a user
async function createBrand(userId: string, name?: string): Promise<string> {
  const brand = await BrandService.create(userId, {
    name: name || `Brand${Date.now()}${Math.random().toString(36).slice(2)}`,
  });
  return brand.id;
}

// Helper to create a consumable type for a user
async function createType(userId: string, name?: string): Promise<string> {
  const type = await ConsumableTypeService.create(userId, {
    name: name || `Type${Date.now()}${Math.random().toString(36).slice(2)}`,
  });
  return type.id;
}

describe('Property 7: Aggregation Calculation Correctness', () => {
  /**
   * Property: For any set of consumables with the same brand, the total remaining weight
   * reported by the dashboard should equal the sum of individual remaining weights.
   */
  it('should correctly aggregate remaining weight by brand', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positiveWeightArb, { minLength: 1, maxLength: 3 }),
        priceArb,
        colorArb,
        async (weights, price, color) => {
          const userId = await createTestUser();
          const brandId = await createBrand(userId);
          const typeId = await createType(userId);

          // Create consumables with the same brand
          let expectedTotal = 0;
          for (const weight of weights) {
            await ConsumableService.create(userId, {
              brandId,
              typeId,
              color,
              weight,
              price,
              purchaseDate: new Date(),
            });
            expectedTotal += weight; // remainingWeight equals weight initially
          }

          // Get aggregated data from dashboard
          const overview = await DashboardService.getInventoryOverview(userId);
          const brandGroup = overview.byBrand.find((b) => b.brandId === brandId);

          expect(brandGroup).toBeDefined();
          expect(brandGroup!.totalRemainingWeight).toBeCloseTo(expectedTotal, 2);
          expect(brandGroup!.count).toBe(weights.length);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For any set of consumables with the same type, the total remaining weight
   * reported by the dashboard should equal the sum of individual remaining weights.
   */
  it('should correctly aggregate remaining weight by type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positiveWeightArb, { minLength: 1, maxLength: 3 }),
        priceArb,
        colorArb,
        async (weights, price, color) => {
          const userId = await createTestUser();
          const brandId = await createBrand(userId);
          const typeId = await createType(userId);

          // Create consumables with the same type
          let expectedTotal = 0;
          for (const weight of weights) {
            await ConsumableService.create(userId, {
              brandId,
              typeId,
              color,
              weight,
              price,
              purchaseDate: new Date(),
            });
            expectedTotal += weight;
          }

          // Get aggregated data from dashboard
          const overview = await DashboardService.getInventoryOverview(userId);
          const typeGroup = overview.byType.find((t) => t.typeId === typeId);

          expect(typeGroup).toBeDefined();
          expect(typeGroup!.totalRemainingWeight).toBeCloseTo(expectedTotal, 2);
          expect(typeGroup!.count).toBe(weights.length);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For any set of consumables with the same color, the total remaining weight
   * reported by the dashboard should equal the sum of individual remaining weights.
   */
  it('should correctly aggregate remaining weight by color', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positiveWeightArb, { minLength: 1, maxLength: 3 }),
        priceArb,
        colorArb,
        async (weights, price, color) => {
          const userId = await createTestUser();
          const brandId = await createBrand(userId);
          const typeId = await createType(userId);

          // Create consumables with the same color
          let expectedTotal = 0;
          for (const weight of weights) {
            await ConsumableService.create(userId, {
              brandId,
              typeId,
              color,
              weight,
              price,
              purchaseDate: new Date(),
            });
            expectedTotal += weight;
          }

          // Get aggregated data from dashboard
          const overview = await DashboardService.getInventoryOverview(userId);
          const colorGroup = overview.byColor.find(
            (c) => c.color.toLowerCase() === color.toLowerCase()
          );

          expect(colorGroup).toBeDefined();
          expect(colorGroup!.totalRemainingWeight).toBeCloseTo(expectedTotal, 2);
          expect(colorGroup!.count).toBe(weights.length);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: The sum of all category totals should equal the overall total.
   * Total remaining weight from stats should equal sum of all individual consumables.
   */
  it('should have consistent totals across stats and individual consumables', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positiveWeightArb, { minLength: 1, maxLength: 4 }),
        fc.array(priceArb, { minLength: 1, maxLength: 4 }),
        async (weights, prices) => {
          const userId = await createTestUser();
          const brandId = await createBrand(userId);
          const typeId = await createType(userId);

          // Create consumables
          let expectedTotalWeight = 0;
          let expectedTotalSpending = 0;
          const count = Math.min(weights.length, prices.length);

          for (let i = 0; i < count; i++) {
            await ConsumableService.create(userId, {
              brandId,
              typeId,
              color: 'White',
              weight: weights[i],
              price: prices[i],
              purchaseDate: new Date(),
            });
            expectedTotalWeight += weights[i];
            expectedTotalSpending += prices[i];
          }

          // Get stats from dashboard
          const stats = await DashboardService.getStats(userId);

          expect(stats.totalConsumables).toBe(count);
          expect(stats.totalRemainingWeight).toBeCloseTo(expectedTotalWeight, 2);
          expect(stats.totalWeight).toBeCloseTo(expectedTotalWeight, 2);
          expect(stats.totalSpending).toBeCloseTo(expectedTotalSpending, 2);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Sum of remaining weights across all brands should equal total remaining weight.
   */
  it('should have brand totals sum to overall total', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positiveWeightArb, { minLength: 2, maxLength: 4 }),
        priceArb,
        async (weights, price) => {
          const userId = await createTestUser();
          const typeId = await createType(userId);

          // Create multiple brands and consumables
          let expectedTotal = 0;
          for (const weight of weights) {
            const brandId = await createBrand(userId);
            await ConsumableService.create(userId, {
              brandId,
              typeId,
              color: 'White',
              weight,
              price,
              purchaseDate: new Date(),
            });
            expectedTotal += weight;
          }

          // Get overview and stats
          const overview = await DashboardService.getInventoryOverview(userId);
          const stats = await DashboardService.getStats(userId);

          // Sum of all brand totals
          const brandTotalSum = overview.byBrand.reduce(
            (sum, b) => sum + b.totalRemainingWeight,
            0
          );

          expect(brandTotalSum).toBeCloseTo(expectedTotal, 2);
          expect(stats.totalRemainingWeight).toBeCloseTo(expectedTotal, 2);
          expect(brandTotalSum).toBeCloseTo(stats.totalRemainingWeight, 2);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Sum of remaining weights across all types should equal total remaining weight.
   */
  it('should have type totals sum to overall total', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(positiveWeightArb, { minLength: 2, maxLength: 4 }),
        priceArb,
        async (weights, price) => {
          const userId = await createTestUser();
          const brandId = await createBrand(userId);

          // Create multiple types and consumables
          let expectedTotal = 0;
          for (const weight of weights) {
            const typeId = await createType(userId);
            await ConsumableService.create(userId, {
              brandId,
              typeId,
              color: 'White',
              weight,
              price,
              purchaseDate: new Date(),
            });
            expectedTotal += weight;
          }

          // Get overview and stats
          const overview = await DashboardService.getInventoryOverview(userId);
          const stats = await DashboardService.getStats(userId);

          // Sum of all type totals
          const typeTotalSum = overview.byType.reduce((sum, t) => sum + t.totalRemainingWeight, 0);

          expect(typeTotalSum).toBeCloseTo(expectedTotal, 2);
          expect(stats.totalRemainingWeight).toBeCloseTo(expectedTotal, 2);
          expect(typeTotalSum).toBeCloseTo(stats.totalRemainingWeight, 2);
        }
      ),
      { numRuns: 5 }
    );
  });
});
