/**
 * Property-Based Tests for Brand CRUD Operations
 * Feature: 3d-printing-consumables-manager, Property 2: CRUD Operations Persistence (Brand)
 * Validates: Requirements 2.1, 2.3
 *
 * Property: For any Brand entity, creating it with valid data and then retrieving it
 * should return an equivalent object with all fields preserved.
 */

import * as fc from 'fast-check';
import { BrandService } from '../services/brand.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid brand names
const validBrandNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,30}$/);

// Arbitrary for generating optional description
const optionalDescriptionArb = fc.option(fc.stringMatching(/^[A-Za-z0-9 .,!?]{5,100}$/), {
  nil: undefined,
});

// Arbitrary for generating optional website
const optionalWebsiteArb = fc.option(
  fc
    .tuple(fc.stringMatching(/^[a-z]{3,10}$/), fc.constantFrom('com', 'org', 'net', 'io'))
    .map(([domain, tld]) => `https://www.${domain}.${tld}`),
  { nil: undefined }
);

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

describe('Property 2: CRUD Operations Persistence (Brand)', () => {
  /**
   * Property: For any valid brand data, creating a brand and then retrieving it
   * should return an equivalent object with all fields preserved.
   */
  it('should persist and retrieve brand data correctly (create-read round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        optionalDescriptionArb,
        optionalWebsiteArb,
        async (name, description, website) => {
          // Create a test user for this iteration
          const { userId } = await createTestUser();

          // Create brand
          const created = await BrandService.create(userId, { name, description, website });

          // Verify created brand has correct data
          expect(created.id).toBeDefined();
          expect(created.userId).toBe(userId);
          expect(created.name).toBe(name);
          expect(created.description).toBe(description ?? null);
          expect(created.website).toBe(website ?? null);

          // Retrieve brand by ID
          const retrieved = await BrandService.findById(userId, created.id);

          // Verify retrieved brand matches created brand
          expect(retrieved.id).toBe(created.id);
          expect(retrieved.userId).toBe(userId);
          expect(retrieved.name).toBe(name);
          expect(retrieved.description).toBe(description ?? null);
          expect(retrieved.website).toBe(website ?? null);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any brand, updating it with new data and then retrieving it
   * should return the updated values. When undefined is passed, the original value is preserved.
   */
  it('should persist updates correctly (update-read round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validBrandNameArb,
        optionalDescriptionArb,
        optionalDescriptionArb,
        optionalWebsiteArb,
        optionalWebsiteArb,
        async (
          originalName,
          updatedName,
          originalDesc,
          updatedDesc,
          originalWebsite,
          updatedWebsite
        ) => {
          // Create a test user
          const { userId } = await createTestUser();

          // Create brand with original data
          const created = await BrandService.create(userId, {
            name: originalName,
            description: originalDesc,
            website: originalWebsite,
          });

          // Update brand with new data
          const updated = await BrandService.update(userId, created.id, {
            name: updatedName,
            description: updatedDesc,
            website: updatedWebsite,
          });

          // Verify update returned correct data
          // Name is always required and updated
          expect(updated.id).toBe(created.id);
          expect(updated.name).toBe(updatedName);

          // For optional fields: undefined means "don't change", so we expect original value
          // If a value was provided, we expect the new value
          const expectedDesc = updatedDesc !== undefined ? updatedDesc : (originalDesc ?? null);
          const expectedWebsite =
            updatedWebsite !== undefined ? updatedWebsite : (originalWebsite ?? null);

          expect(updated.description).toBe(expectedDesc);
          expect(updated.website).toBe(expectedWebsite);

          // Retrieve and verify persistence
          const retrieved = await BrandService.findById(userId, created.id);
          expect(retrieved.name).toBe(updatedName);
          expect(retrieved.description).toBe(expectedDesc);
          expect(retrieved.website).toBe(expectedWebsite);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any user, findAllByUser should return all brands created by that user.
   */
  it('should list all brands for a user correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validBrandNameArb, { minLength: 1, maxLength: 5 }),
        async (brandNames) => {
          // Ensure unique names
          const uniqueNames = [...new Set(brandNames)];
          if (uniqueNames.length === 0) return;

          // Create a test user
          const { userId } = await createTestUser();

          // Create multiple brands
          const createdBrands = [];
          for (const name of uniqueNames) {
            const brand = await BrandService.create(userId, { name });
            createdBrands.push(brand);
          }

          // Retrieve all brands for user
          const allBrands = await BrandService.findAllByUser(userId);

          // Verify all created brands are in the list
          expect(allBrands.length).toBe(uniqueNames.length);
          for (const created of createdBrands) {
            const found = allBrands.find((b) => b.id === created.id);
            expect(found).toBeDefined();
            expect(found?.name).toBe(created.name);
          }
        }
      ),
      { numRuns: 3 }
    );
  });
});
