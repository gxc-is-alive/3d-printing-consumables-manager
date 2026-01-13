/**
 * Property-Based Tests for Consumable Batch Create Operations
 * Feature: consumable-accessory-enhancements
 *
 * Property 1: 批量创建数量一致性
 * Property 2: 批量创建属性共享
 * Property 3: 批量创建事务原子性
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import * as fc from 'fast-check';
import { ConsumableService } from '../services/consumable.service';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid color names
const validColorNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,20}$/);

// Arbitrary for generating valid hex colors
const validHexColorArb = fc.option(
  fc.hexaString({ minLength: 6, maxLength: 6 }).map((hex) => `#${hex}`),
  { nil: undefined }
);

// Arbitrary for generating positive weight (in grams)
const positiveWeightArb = fc.float({ min: 100, max: 5000, noNaN: true });

// Arbitrary for generating positive price
const positivePriceArb = fc.float({ min: 1, max: 500, noNaN: true });

// Arbitrary for generating purchase date (within last year)
const purchaseDateArb = fc.date({
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

describe('Feature: consumable-accessory-enhancements, Property 1: 批量创建数量一致性', () => {
  /**
   * Property 1: 对于任意批量创建请求，指定数量为N时，创建成功后应该产生恰好N条独立的耗材记录，
   * 且每条记录具有唯一的ID。
   * Validates: Requirements 1.1, 1.2
   */
  it('should create exactly N consumables with unique IDs when quantity is N', async () => {
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
          });

          // Verify count matches requested quantity
          expect(result.count).toBe(quantity);
          expect(result.consumables.length).toBe(quantity);

          // Verify all IDs are unique
          const ids = result.consumables.map((c) => c.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(quantity);

          // Verify each ID is defined and non-empty
          for (const consumable of result.consumables) {
            expect(consumable.id).toBeDefined();
            expect(consumable.id.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: consumable-accessory-enhancements, Property 2: 批量创建属性共享', () => {
  /**
   * Property 2: 对于任意批量创建的耗材记录集合，所有记录应该共享相同的品牌ID、类型ID、
   * 颜色、颜色代码、重量、价格和购买日期。
   * Validates: Requirements 1.3
   */
  it('should share same attributes across all batch-created consumables', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validHexColorArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        batchQuantityArb,
        async (color, colorHex, weight, price, purchaseDate, quantity) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          const result = await ConsumableService.batchCreate(userId, {
            brandId,
            typeId,
            color,
            colorHex,
            weight,
            price,
            purchaseDate,
            quantity,
          });

          // Verify all consumables share the same attributes
          for (const consumable of result.consumables) {
            expect(consumable.brandId).toBe(brandId);
            expect(consumable.typeId).toBe(typeId);
            expect(consumable.color).toBe(color);
            expect(consumable.colorHex).toBe(colorHex ?? null);
            expect(consumable.weight).toBeCloseTo(weight, 2);
            expect(consumable.price).toBeCloseTo(price, 2);
            expect(consumable.userId).toBe(userId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: consumable-accessory-enhancements, Property 3: 批量创建事务原子性', () => {
  /**
   * Property 3: 对于任意批量创建操作，如果过程中发生错误，数据库中不应该存在任何该批次的部分记录
   * （全部成功或全部失败）。
   * Validates: Requirements 1.4
   */
  it('should reject batch creation with invalid quantity (less than 1)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        fc.integer({ min: -10, max: 0 }),
        async (color, weight, price, purchaseDate, invalidQuantity) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          // Count consumables before
          const beforeCount = (await ConsumableService.findAllByUser(userId)).length;

          // Attempt batch create with invalid quantity
          await expect(
            ConsumableService.batchCreate(userId, {
              brandId,
              typeId,
              color,
              weight,
              price,
              purchaseDate,
              quantity: invalidQuantity,
            })
          ).rejects.toThrow('Quantity must be at least 1');

          // Verify no consumables were created
          const afterCount = (await ConsumableService.findAllByUser(userId)).length;
          expect(afterCount).toBe(beforeCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject batch creation with invalid brand and create no records', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        batchQuantityArb,
        async (color, weight, price, purchaseDate, quantity) => {
          const { userId, typeId } = await createTestUserWithDependencies();

          // Count consumables before
          const beforeCount = (await ConsumableService.findAllByUser(userId)).length;

          // Attempt batch create with invalid brand
          await expect(
            ConsumableService.batchCreate(userId, {
              brandId: 'invalid-brand-id',
              typeId,
              color,
              weight,
              price,
              purchaseDate,
              quantity,
            })
          ).rejects.toThrow('Brand not found');

          // Verify no consumables were created (atomicity)
          const afterCount = (await ConsumableService.findAllByUser(userId)).length;
          expect(afterCount).toBe(beforeCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
