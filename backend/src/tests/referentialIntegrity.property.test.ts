/**
 * Property-Based Tests for Referential Integrity Protection
 * Feature: 3d-printing-consumables-manager, Property 3: Referential Integrity Protection
 * Validates: Requirements 2.5, 3.5
 *
 * Property: For any Brand or ConsumableType that has associated Consumables,
 * attempting to delete it should fail and return an error, while the entity remains in the database.
 */

import * as fc from 'fast-check';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { ConsumableService } from '../services/consumable.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid brand names
const validBrandNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,20}$/);

// Arbitrary for generating valid consumable type names
const validTypeNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,20}$/);

// Arbitrary for generating valid color names
const validColorArb = fc.constantFrom('Red', 'Blue', 'Green', 'Black', 'White', 'Yellow');

// Arbitrary for generating valid hex colors
const validColorHexArb = fc.hexaString({ minLength: 6, maxLength: 6 }).map((hex) => `#${hex}`);

// Arbitrary for generating positive weights
const positiveWeightArb = fc.float({ min: 100, max: 2000, noNaN: true });

// Arbitrary for generating positive prices
const positivePriceArb = fc.float({ min: 10, max: 500, noNaN: true });

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

describe('Property 3: Referential Integrity Protection', () => {
  /**
   * Property: For any Brand that has associated Consumables,
   * attempting to delete it should fail with an error, and the brand should remain in the database.
   */
  it('should prevent deletion of brands with associated consumables', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validTypeNameArb,
        validColorArb,
        validColorHexArb,
        positiveWeightArb,
        positivePriceArb,
        async (brandName, typeName, color, colorHex, weight, price) => {
          // Create a test user
          const { userId } = await createTestUser();

          // Create a brand
          const brand = await BrandService.create(userId, { name: brandName });

          // Create a consumable type
          const type = await ConsumableTypeService.create(userId, { name: typeName });

          // Create a consumable associated with the brand
          await ConsumableService.create(userId, {
            brandId: brand.id,
            typeId: type.id,
            color,
            colorHex,
            weight,
            price,
            purchaseDate: new Date(),
          });

          // Attempt to delete the brand - should fail
          await expect(BrandService.delete(userId, brand.id)).rejects.toThrow(
            'Cannot delete brand with existing consumables'
          );

          // Verify the brand still exists in the database
          const retrievedBrand = await BrandService.findById(userId, brand.id);
          expect(retrievedBrand).toBeDefined();
          expect(retrievedBrand.id).toBe(brand.id);
          expect(retrievedBrand.name).toBe(brandName);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any ConsumableType that has associated Consumables,
   * attempting to delete it should fail with an error, and the type should remain in the database.
   */
  it('should prevent deletion of consumable types with associated consumables', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validTypeNameArb,
        validColorArb,
        validColorHexArb,
        positiveWeightArb,
        positivePriceArb,
        async (brandName, typeName, color, colorHex, weight, price) => {
          // Create a test user
          const { userId } = await createTestUser();

          // Create a brand
          const brand = await BrandService.create(userId, { name: brandName });

          // Create a consumable type
          const type = await ConsumableTypeService.create(userId, { name: typeName });

          // Create a consumable associated with the type
          await ConsumableService.create(userId, {
            brandId: brand.id,
            typeId: type.id,
            color,
            colorHex,
            weight,
            price,
            purchaseDate: new Date(),
          });

          // Attempt to delete the type - should fail
          await expect(ConsumableTypeService.delete(userId, type.id)).rejects.toThrow(
            'Cannot delete type with existing consumables'
          );

          // Verify the type still exists in the database
          const retrievedType = await ConsumableTypeService.findById(userId, type.id);
          expect(retrievedType).toBeDefined();
          expect(retrievedType.id).toBe(type.id);
          expect(retrievedType.name).toBe(typeName);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any Brand without associated Consumables,
   * deletion should succeed and the brand should no longer exist.
   */
  it('should allow deletion of brands without associated consumables', async () => {
    await fc.assert(
      fc.asyncProperty(validBrandNameArb, async (brandName) => {
        // Create a test user
        const { userId } = await createTestUser();

        // Create a brand (no consumables)
        const brand = await BrandService.create(userId, { name: brandName });

        // Delete the brand - should succeed
        await BrandService.delete(userId, brand.id);

        // Verify the brand no longer exists
        await expect(BrandService.findById(userId, brand.id)).rejects.toThrow('Brand not found');
      }),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any ConsumableType without associated Consumables,
   * deletion should succeed and the type should no longer exist.
   */
  it('should allow deletion of consumable types without associated consumables', async () => {
    await fc.assert(
      fc.asyncProperty(validTypeNameArb, async (typeName) => {
        // Create a test user
        const { userId } = await createTestUser();

        // Create a consumable type (no consumables)
        const type = await ConsumableTypeService.create(userId, { name: typeName });

        // Delete the type - should succeed
        await ConsumableTypeService.delete(userId, type.id);

        // Verify the type no longer exists
        await expect(ConsumableTypeService.findById(userId, type.id)).rejects.toThrow(
          'Consumable type not found'
        );
      }),
      { numRuns: 3 }
    );
  });
});
