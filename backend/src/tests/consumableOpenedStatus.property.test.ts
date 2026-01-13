/**
 * Property-Based Tests for Consumable Opened Status
 * Feature: consumable-accessory-enhancements
 *
 * Property 4: 开封状态默认值
 * Property 5: 批量创建开封状态一致性
 * Validates: Requirements 2.3, 2.4, 2.5
 */

import * as fc from 'fast-check';
import { ConsumableService } from '../services/consumable.service';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid color names
const validColorNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,20}$/);

// Arbitrary for generating positive weight (in grams)
const positiveWeightArb = fc.float({ min: 100, max: 5000, noNaN: true });

// Arbitrary for generating positive price
const positivePriceArb = fc.float({ min: 1, max: 500, noNaN: true });

// Arbitrary for generating purchase date (within last year)
const purchaseDateArb = fc.date({
  min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  max: new Date(),
});

// Arbitrary for generating opened date (within last year)
const openedDateArb = fc.date({
  min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  max: new Date(),
});

// Arbitrary for generating batch quantity (1-10)
const batchQuantityArb = fc.integer({ min: 1, max: 10 });

// Helper to create a test user with brand and type
async function createTestUserWithDependencies(): Promise<{
  userId: string;
  brandId: string;
  typeId: string;
}> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  const userId = result.user.id;

  const brand = await BrandService.create(userId, {
    name: `TestBrand${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  const type = await ConsumableTypeService.create(userId, {
    name: `TestType${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  return { userId, brandId: brand.id, typeId: type.id };
}

describe('Feature: consumable-accessory-enhancements, Property 4: 开封状态默认值', () => {
  /**
   * Property 4: 对于任意创建的耗材，当isOpened为true且未指定openedAt时，
   * openedAt应该被设置为当前日期；当isOpened为false时，openedAt应该为null。
   * Validates: Requirements 2.3, 2.4
   */
  it('should set openedAt to current date when isOpened is true and openedAt not specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        async (color, weight, price, purchaseDate) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const beforeCreate = new Date();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            weight,
            price,
            purchaseDate,
            quantity: 1,
            isOpened: true,
            // openedAt not specified
          });

          const afterCreate = new Date();

          expect(result.consumables.length).toBe(1);
          const consumable = result.consumables[0];

          expect(consumable.isOpened).toBe(true);
          expect(consumable.openedAt).not.toBeNull();

          // openedAt should be between beforeCreate and afterCreate
          const openedAt = new Date(consumable.openedAt!);
          expect(openedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
          expect(openedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set openedAt to specified date when isOpened is true and openedAt is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        openedDateArb,
        async (color, weight, price, purchaseDate, openedAt) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            weight,
            price,
            purchaseDate,
            quantity: 1,
            isOpened: true,
            openedAt,
          });

          expect(result.consumables.length).toBe(1);
          const consumable = result.consumables[0];

          expect(consumable.isOpened).toBe(true);
          expect(consumable.openedAt).not.toBeNull();

          // openedAt should match the specified date
          const actualOpenedAt = new Date(consumable.openedAt!);
          expect(actualOpenedAt.getTime()).toBeCloseTo(openedAt.getTime(), -3); // within 1 second
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set openedAt to null when isOpened is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        async (color, weight, price, purchaseDate) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            weight,
            price,
            purchaseDate,
            quantity: 1,
            isOpened: false,
          });

          expect(result.consumables.length).toBe(1);
          const consumable = result.consumables[0];

          expect(consumable.isOpened).toBe(false);
          expect(consumable.openedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should default to unopened when isOpened is not specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        async (color, weight, price, purchaseDate) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            weight,
            price,
            purchaseDate,
            quantity: 1,
            // isOpened not specified
          });

          expect(result.consumables.length).toBe(1);
          const consumable = result.consumables[0];

          expect(consumable.isOpened).toBe(false);
          expect(consumable.openedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: consumable-accessory-enhancements, Property 5: 批量创建开封状态一致性', () => {
  /**
   * Property 5: 对于任意批量创建的耗材记录集合，所有记录的isOpened和openedAt字段应该具有相同的值。
   * Validates: Requirements 2.5
   */
  it('should apply same opened status to all batch-created consumables (opened)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        openedDateArb,
        batchQuantityArb,
        async (color, weight, price, purchaseDate, openedAt, quantity) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            weight,
            price,
            purchaseDate,
            quantity,
            isOpened: true,
            openedAt,
          });

          expect(result.consumables.length).toBe(quantity);

          // All consumables should have the same opened status
          for (const consumable of result.consumables) {
            expect(consumable.isOpened).toBe(true);
            expect(consumable.openedAt).not.toBeNull();

            // All should have the same openedAt value
            const actualOpenedAt = new Date(consumable.openedAt!);
            expect(actualOpenedAt.getTime()).toBeCloseTo(openedAt.getTime(), -3);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply same unopened status to all batch-created consumables', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        batchQuantityArb,
        async (color, weight, price, purchaseDate, quantity) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            weight,
            price,
            purchaseDate,
            quantity,
            isOpened: false,
          });

          expect(result.consumables.length).toBe(quantity);

          // All consumables should have the same unopened status
          for (const consumable of result.consumables) {
            expect(consumable.isOpened).toBe(false);
            expect(consumable.openedAt).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
