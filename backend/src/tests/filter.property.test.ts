/**
 * Property-Based Tests for Filter Results Correctness
 * Feature: 3d-printing-consumables-manager, Property 5: Filter Results Correctness
 * Validates: Requirements 6.3, 7.2, 8.3
 *
 * Property: For any filter criteria (brand, type, color, opened status), the returned
 * consumables should all match the specified criteria, and no matching consumables
 * should be excluded.
 */

import * as fc from 'fast-check';
import { ConsumableService, ConsumableResponse } from '../services/consumable.service';
import { BrandService, BrandResponse } from '../services/brand.service';
import { ConsumableTypeService, ConsumableTypeResponse } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid color names
const validColorNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,15}$/);

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
async function createBrand(userId: string, name: string): Promise<BrandResponse> {
  return BrandService.create(userId, { name });
}

// Helper to create a consumable type for a user
async function createType(userId: string, name: string): Promise<ConsumableTypeResponse> {
  return ConsumableTypeService.create(userId, { name });
}

describe('Property 5: Filter Results Correctness', () => {
  /**
   * Property: For any brand filter, all returned consumables should have the specified brandId,
   * and all consumables with that brandId should be included.
   */
  it('should filter by brand correctly - all results match and none excluded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validColorNameArb, { minLength: 2, maxLength: 4 }),
        async (colors) => {
          const userId = await createTestUser();

          // Create two brands
          const brand1 = await createBrand(
            userId,
            `Brand1_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );
          const brand2 = await createBrand(
            userId,
            `Brand2_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );
          const type = await createType(
            userId,
            `Type_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );

          // Create consumables with different brands
          const brand1Consumables: ConsumableResponse[] = [];
          const brand2Consumables: ConsumableResponse[] = [];

          for (let i = 0; i < colors.length; i++) {
            const brand = i % 2 === 0 ? brand1 : brand2;
            const consumable = await ConsumableService.create(userId, {
              brandId: brand.id,
              typeId: type.id,
              color: colors[i],
              weight: 1000,
              price: 50,
              purchaseDate: new Date(),
            });
            if (brand.id === brand1.id) {
              brand1Consumables.push(consumable);
            } else {
              brand2Consumables.push(consumable);
            }
          }

          // Filter by brand1
          const filtered = await ConsumableService.findAllByUser(userId, { brandId: brand1.id });

          // All results should have brand1's brandId
          for (const c of filtered) {
            expect(c.brandId).toBe(brand1.id);
          }

          // All brand1 consumables should be included
          expect(filtered.length).toBe(brand1Consumables.length);
          for (const expected of brand1Consumables) {
            const found = filtered.find((c) => c.id === expected.id);
            expect(found).toBeDefined();
          }

          // Verify brand2 consumables are not included
          for (const notExpected of brand2Consumables) {
            const found = filtered.find((c) => c.id === notExpected.id);
            expect(found).toBeUndefined();
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For any type filter, all returned consumables should have the specified typeId,
   * and all consumables with that typeId should be included.
   */
  it('should filter by type correctly - all results match and none excluded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validColorNameArb, { minLength: 2, maxLength: 4 }),
        async (colors) => {
          const userId = await createTestUser();

          const brand = await createBrand(
            userId,
            `Brand_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );
          // Create two types
          const type1 = await createType(
            userId,
            `Type1_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );
          const type2 = await createType(
            userId,
            `Type2_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );

          // Create consumables with different types
          const type1Consumables: ConsumableResponse[] = [];
          const type2Consumables: ConsumableResponse[] = [];

          for (let i = 0; i < colors.length; i++) {
            const type = i % 2 === 0 ? type1 : type2;
            const consumable = await ConsumableService.create(userId, {
              brandId: brand.id,
              typeId: type.id,
              color: colors[i],
              weight: 1000,
              price: 50,
              purchaseDate: new Date(),
            });
            if (type.id === type1.id) {
              type1Consumables.push(consumable);
            } else {
              type2Consumables.push(consumable);
            }
          }

          // Filter by type1
          const filtered = await ConsumableService.findAllByUser(userId, { typeId: type1.id });

          // All results should have type1's typeId
          for (const c of filtered) {
            expect(c.typeId).toBe(type1.id);
          }

          // All type1 consumables should be included
          expect(filtered.length).toBe(type1Consumables.length);
          for (const expected of type1Consumables) {
            const found = filtered.find((c) => c.id === expected.id);
            expect(found).toBeDefined();
          }

          // Verify type2 consumables are not included
          for (const notExpected of type2Consumables) {
            const found = filtered.find((c) => c.id === notExpected.id);
            expect(found).toBeUndefined();
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For any color filter, all returned consumables should contain the color string,
   * and all consumables containing that color should be included.
   */
  it('should filter by color correctly - all results match and none excluded', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const userId = await createTestUser();

        const brand = await createBrand(
          userId,
          `Brand_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        const type = await createType(
          userId,
          `Type_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );

        // Create consumables with specific colors
        const redConsumable = await ConsumableService.create(userId, {
          brandId: brand.id,
          typeId: type.id,
          color: 'Red',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });

        const darkRedConsumable = await ConsumableService.create(userId, {
          brandId: brand.id,
          typeId: type.id,
          color: 'Dark Red',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });

        const blueConsumable = await ConsumableService.create(userId, {
          brandId: brand.id,
          typeId: type.id,
          color: 'Blue',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });

        // Filter by "Red" - should match "Red" and "Dark Red"
        const filtered = await ConsumableService.findAllByUser(userId, { color: 'Red' });

        // All results should contain "Red" in color
        for (const c of filtered) {
          expect(c.color.toLowerCase()).toContain('red');
        }

        // Should include both Red and Dark Red
        expect(filtered.length).toBe(2);
        expect(filtered.find((c) => c.id === redConsumable.id)).toBeDefined();
        expect(filtered.find((c) => c.id === darkRedConsumable.id)).toBeDefined();
        expect(filtered.find((c) => c.id === blueConsumable.id)).toBeUndefined();
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For any isOpened filter, all returned consumables should have the specified
   * isOpened status, and all consumables with that status should be included.
   */
  it('should filter by opened status correctly - all results match and none excluded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validColorNameArb, { minLength: 2, maxLength: 4 }),
        async (colors) => {
          const userId = await createTestUser();

          const brand = await createBrand(
            userId,
            `Brand_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );
          const type = await createType(
            userId,
            `Type_${Date.now()}_${Math.random().toString(36).slice(2)}`
          );

          // Create consumables and mark some as opened
          const openedConsumables: ConsumableResponse[] = [];
          const unopenedConsumables: ConsumableResponse[] = [];

          for (let i = 0; i < colors.length; i++) {
            const consumable = await ConsumableService.create(userId, {
              brandId: brand.id,
              typeId: type.id,
              color: colors[i],
              weight: 1000,
              price: 50,
              purchaseDate: new Date(),
            });

            if (i % 2 === 0) {
              // Mark as opened
              const openedConsumable = await ConsumableService.markAsOpened(userId, consumable.id);
              openedConsumables.push(openedConsumable);
            } else {
              unopenedConsumables.push(consumable);
            }
          }

          // Filter by isOpened = true
          const filteredOpened = await ConsumableService.findAllByUser(userId, { isOpened: true });

          // All results should be opened
          for (const c of filteredOpened) {
            expect(c.isOpened).toBe(true);
          }

          // All opened consumables should be included
          expect(filteredOpened.length).toBe(openedConsumables.length);

          // Filter by isOpened = false
          const filteredUnopened = await ConsumableService.findAllByUser(userId, {
            isOpened: false,
          });

          // All results should be unopened
          for (const c of filteredUnopened) {
            expect(c.isOpened).toBe(false);
          }

          // All unopened consumables should be included
          expect(filteredUnopened.length).toBe(unopenedConsumables.length);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For combined filters, all returned consumables should match ALL criteria,
   * and all consumables matching all criteria should be included.
   */
  it('should filter by multiple criteria correctly - intersection of all filters', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const userId = await createTestUser();

        const brand1 = await createBrand(
          userId,
          `Brand1_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        const brand2 = await createBrand(
          userId,
          `Brand2_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        const type1 = await createType(
          userId,
          `Type1_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        const type2 = await createType(
          userId,
          `Type2_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );

        // Create consumables with various combinations
        const c1 = await ConsumableService.create(userId, {
          brandId: brand1.id,
          typeId: type1.id,
          color: 'Red',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });
        await ConsumableService.markAsOpened(userId, c1.id);

        // c2: brand1, type1, Blue, unopened
        await ConsumableService.create(userId, {
          brandId: brand1.id,
          typeId: type1.id,
          color: 'Blue',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });

        const c3 = await ConsumableService.create(userId, {
          brandId: brand1.id,
          typeId: type2.id,
          color: 'Red',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });
        await ConsumableService.markAsOpened(userId, c3.id);

        const c4 = await ConsumableService.create(userId, {
          brandId: brand2.id,
          typeId: type1.id,
          color: 'Red',
          weight: 1000,
          price: 50,
          purchaseDate: new Date(),
        });
        await ConsumableService.markAsOpened(userId, c4.id);

        // Filter by brand1 + type1 + opened
        const filtered = await ConsumableService.findAllByUser(userId, {
          brandId: brand1.id,
          typeId: type1.id,
          isOpened: true,
        });

        // Should only return c1 (brand1, type1, opened)
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe(c1.id);

        // Verify all criteria match
        for (const c of filtered) {
          expect(c.brandId).toBe(brand1.id);
          expect(c.typeId).toBe(type1.id);
          expect(c.isOpened).toBe(true);
        }
      }),
      { numRuns: 5 }
    );
  });
});
