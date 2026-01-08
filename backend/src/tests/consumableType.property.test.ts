/**
 * Property-Based Tests for ConsumableType CRUD Operations
 * Feature: 3d-printing-consumables-manager, Property 2: CRUD Operations Persistence (ConsumableType)
 * Validates: Requirements 3.1, 3.3
 *
 * Property: For any ConsumableType entity, creating it with valid data and then retrieving it
 * should return an equivalent object with all fields preserved.
 */

import * as fc from 'fast-check';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid consumable type names (e.g., PLA, ABS, PETG)
const validTypeNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 -]{1,20}$/);

// Arbitrary for generating optional description
const optionalDescriptionArb = fc.option(fc.stringMatching(/^[A-Za-z0-9 .,!?-]{5,100}$/), {
  nil: undefined,
});

// Arbitrary for generating optional temperature values (realistic 3D printing temps)
const optionalTempArb = fc.option(fc.integer({ min: 0, max: 400 }), { nil: undefined });

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

describe('Property 2: CRUD Operations Persistence (ConsumableType)', () => {
  /**
   * Property: For any valid consumable type data, creating a type and then retrieving it
   * should return an equivalent object with all fields preserved.
   */
  it('should persist and retrieve consumable type data correctly (create-read round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validTypeNameArb,
        optionalDescriptionArb,
        optionalTempArb,
        optionalTempArb,
        optionalTempArb,
        optionalTempArb,
        async (name, description, printTempMin, printTempMax, bedTempMin, bedTempMax) => {
          // Create a test user for this iteration
          const { userId } = await createTestUser();

          // Create consumable type
          const created = await ConsumableTypeService.create(userId, {
            name,
            description,
            printTempMin,
            printTempMax,
            bedTempMin,
            bedTempMax,
          });

          // Verify created type has correct data
          expect(created.id).toBeDefined();
          expect(created.userId).toBe(userId);
          expect(created.name).toBe(name);
          expect(created.description).toBe(description ?? null);
          expect(created.printTempMin).toBe(printTempMin ?? null);
          expect(created.printTempMax).toBe(printTempMax ?? null);
          expect(created.bedTempMin).toBe(bedTempMin ?? null);
          expect(created.bedTempMax).toBe(bedTempMax ?? null);

          // Retrieve type by ID
          const retrieved = await ConsumableTypeService.findById(userId, created.id);

          // Verify retrieved type matches created type
          expect(retrieved.id).toBe(created.id);
          expect(retrieved.userId).toBe(userId);
          expect(retrieved.name).toBe(name);
          expect(retrieved.description).toBe(description ?? null);
          expect(retrieved.printTempMin).toBe(printTempMin ?? null);
          expect(retrieved.printTempMax).toBe(printTempMax ?? null);
          expect(retrieved.bedTempMin).toBe(bedTempMin ?? null);
          expect(retrieved.bedTempMax).toBe(bedTempMax ?? null);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any consumable type, updating it with new data and then retrieving it
   * should return the updated values.
   */
  it('should persist updates correctly (update-read round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validTypeNameArb,
        validTypeNameArb,
        optionalDescriptionArb,
        optionalDescriptionArb,
        optionalTempArb,
        optionalTempArb,
        async (originalName, updatedName, originalDesc, updatedDesc, originalTemp, updatedTemp) => {
          // Create a test user
          const { userId } = await createTestUser();

          // Create type with original data
          const created = await ConsumableTypeService.create(userId, {
            name: originalName,
            description: originalDesc,
            printTempMin: originalTemp,
          });

          // Update type with new data
          const updated = await ConsumableTypeService.update(userId, created.id, {
            name: updatedName,
            description: updatedDesc,
            printTempMin: updatedTemp,
          });

          // Verify update returned correct data
          expect(updated.id).toBe(created.id);
          expect(updated.name).toBe(updatedName);

          // For optional fields: undefined means "don't change"
          const expectedDesc = updatedDesc !== undefined ? updatedDesc : (originalDesc ?? null);
          const expectedTemp = updatedTemp !== undefined ? updatedTemp : (originalTemp ?? null);

          expect(updated.description).toBe(expectedDesc);
          expect(updated.printTempMin).toBe(expectedTemp);

          // Retrieve and verify persistence
          const retrieved = await ConsumableTypeService.findById(userId, created.id);
          expect(retrieved.name).toBe(updatedName);
          expect(retrieved.description).toBe(expectedDesc);
          expect(retrieved.printTempMin).toBe(expectedTemp);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any user, findAllByUser should return all consumable types created by that user.
   */
  it('should list all consumable types for a user correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validTypeNameArb, { minLength: 1, maxLength: 5 }),
        async (typeNames) => {
          // Ensure unique names
          const uniqueNames = [...new Set(typeNames)];
          if (uniqueNames.length === 0) return;

          // Create a test user
          const { userId } = await createTestUser();

          // Create multiple types
          const createdTypes = [];
          for (const name of uniqueNames) {
            const type = await ConsumableTypeService.create(userId, { name });
            createdTypes.push(type);
          }

          // Retrieve all types for user
          const allTypes = await ConsumableTypeService.findAllByUser(userId);

          // Verify all created types are in the list
          expect(allTypes.length).toBe(uniqueNames.length);
          for (const created of createdTypes) {
            const found = allTypes.find((t) => t.id === created.id);
            expect(found).toBeDefined();
            expect(found?.name).toBe(created.name);
          }
        }
      ),
      { numRuns: 3 }
    );
  });
});
