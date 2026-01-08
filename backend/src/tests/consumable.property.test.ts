/**
 * Property-Based Tests for Consumable CRUD Operations
 * Feature: 3d-printing-consumables-manager, Property 2: CRUD Operations Persistence (Consumable)
 * Validates: Requirements 4.1, 4.3
 *
 * Property: For any Consumable entity, creating it with valid data and then retrieving it
 * should return an equivalent object with all fields preserved.
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

// Arbitrary for generating optional notes
const optionalNotesArb = fc.option(fc.stringMatching(/^[A-Za-z0-9 .,!?]{5,50}$/), {
  nil: undefined,
});

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

  // Create a brand for the user
  const brand = await BrandService.create(userId, {
    name: `TestBrand${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  // Create a consumable type for the user
  const type = await ConsumableTypeService.create(userId, {
    name: `TestType${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  return { userId, brandId: brand.id, typeId: type.id };
}

describe('Property 2: CRUD Operations Persistence (Consumable)', () => {
  /**
   * Property: For any valid consumable data, creating a consumable and then retrieving it
   * should return an equivalent object with all fields preserved.
   */
  it('should persist and retrieve consumable data correctly (create-read round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validHexColorArb,
        positiveWeightArb,
        positivePriceArb,
        purchaseDateArb,
        optionalNotesArb,
        async (color, colorHex, weight, price, purchaseDate, notes) => {
          // Create a test user with dependencies
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          // Create consumable
          const created = await ConsumableService.create(userId, {
            brandId,
            typeId,
            color,
            colorHex,
            weight,
            price,
            purchaseDate,
            notes,
          });

          // Verify created consumable has correct data
          expect(created.id).toBeDefined();
          expect(created.userId).toBe(userId);
          expect(created.brandId).toBe(brandId);
          expect(created.typeId).toBe(typeId);
          expect(created.color).toBe(color);
          expect(created.colorHex).toBe(colorHex ?? null);
          expect(created.weight).toBeCloseTo(weight, 2);
          expect(created.remainingWeight).toBeCloseTo(weight, 2); // Initially equal to weight
          expect(created.price).toBeCloseTo(price, 2);
          expect(created.notes).toBe(notes ?? null);
          expect(created.isOpened).toBe(false);
          expect(created.openedAt).toBeNull();

          // Retrieve consumable by ID
          const retrieved = await ConsumableService.findById(userId, created.id);

          // Verify retrieved consumable matches created consumable
          expect(retrieved.id).toBe(created.id);
          expect(retrieved.userId).toBe(userId);
          expect(retrieved.brandId).toBe(brandId);
          expect(retrieved.typeId).toBe(typeId);
          expect(retrieved.color).toBe(color);
          expect(retrieved.colorHex).toBe(colorHex ?? null);
          expect(retrieved.weight).toBeCloseTo(weight, 2);
          expect(retrieved.remainingWeight).toBeCloseTo(weight, 2);
          expect(retrieved.price).toBeCloseTo(price, 2);
          expect(retrieved.notes).toBe(notes ?? null);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any consumable, updating it with new data and then retrieving it
   * should return the updated values.
   */
  it('should persist updates correctly (update-read round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validColorNameArb,
        positiveWeightArb,
        positiveWeightArb,
        positivePriceArb,
        positivePriceArb,
        async (
          originalColor,
          updatedColor,
          originalWeight,
          updatedWeight,
          originalPrice,
          updatedPrice
        ) => {
          // Create a test user with dependencies
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          // Create consumable with original data
          const created = await ConsumableService.create(userId, {
            brandId,
            typeId,
            color: originalColor,
            weight: originalWeight,
            price: originalPrice,
            purchaseDate: new Date(),
          });

          // Update consumable with new data
          const updated = await ConsumableService.update(userId, created.id, {
            color: updatedColor,
            weight: updatedWeight,
            price: updatedPrice,
          });

          // Verify update returned correct data
          expect(updated.id).toBe(created.id);
          expect(updated.color).toBe(updatedColor);
          expect(updated.weight).toBeCloseTo(updatedWeight, 2);
          expect(updated.price).toBeCloseTo(updatedPrice, 2);

          // Retrieve and verify persistence
          const retrieved = await ConsumableService.findById(userId, created.id);
          expect(retrieved.color).toBe(updatedColor);
          expect(retrieved.weight).toBeCloseTo(updatedWeight, 2);
          expect(retrieved.price).toBeCloseTo(updatedPrice, 2);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any user, findAllByUser should return all consumables created by that user.
   */
  it('should list all consumables for a user correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validColorNameArb, { minLength: 1, maxLength: 3 }),
        async (colors) => {
          // Create a test user with dependencies
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          // Create multiple consumables
          const createdConsumables = [];
          for (const color of colors) {
            const consumable = await ConsumableService.create(userId, {
              brandId,
              typeId,
              color,
              weight: 1000,
              price: 50,
              purchaseDate: new Date(),
            });
            createdConsumables.push(consumable);
          }

          // Retrieve all consumables for user
          const allConsumables = await ConsumableService.findAllByUser(userId);

          // Verify all created consumables are in the list
          expect(allConsumables.length).toBe(colors.length);
          for (const created of createdConsumables) {
            const found = allConsumables.find((c) => c.id === created.id);
            expect(found).toBeDefined();
            expect(found?.color).toBe(created.color);
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Marking a consumable as opened should update isOpened and openedAt fields.
   */
  it('should correctly mark consumable as opened', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, positiveWeightArb, async (color, weight) => {
        // Create a test user with dependencies
        const { userId, brandId, typeId } = await createTestUserWithDependencies();

        // Create consumable
        const created = await ConsumableService.create(userId, {
          brandId,
          typeId,
          color,
          weight,
          price: 50,
          purchaseDate: new Date(),
        });

        // Verify initially not opened
        expect(created.isOpened).toBe(false);
        expect(created.openedAt).toBeNull();

        // Mark as opened
        const opened = await ConsumableService.markAsOpened(userId, created.id);

        // Verify opened status
        expect(opened.isOpened).toBe(true);
        expect(opened.openedAt).toBeDefined();
        expect(opened.openedAt).not.toBeNull();

        // Retrieve and verify persistence
        const retrieved = await ConsumableService.findById(userId, created.id);
        expect(retrieved.isOpened).toBe(true);
        expect(retrieved.openedAt).not.toBeNull();
      }),
      { numRuns: 3 }
    );
  });
});
