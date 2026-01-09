/**
 * Property-Based Tests for Accessory Category Service
 * Feature: printer-accessories
 *
 * Property 12: 分类删除约束
 *
 * Validates: Requirements 1.4, 1.5
 */

import * as fc from 'fast-check';
import { AccessoryCategoryService } from '../services/accessoryCategory.service';
import { AccessoryService } from '../services/accessory.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating category names
const categoryNameArb = fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5]{2,20}$/);

// Arbitrary for generating optional description
const optionalDescriptionArb = fc.option(
  fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5 .,!?]{5,100}$/),
  { nil: undefined }
);

// Arbitrary for generating accessory names
const accessoryNameArb = fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5]{2,30}$/);

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

describe('Property 12: 分类删除约束', () => {
  /**
   * Property: For any category, if accessories exist under it, deletion should be rejected.
   * If no accessories exist, deletion should succeed.
   */
  it('should reject deletion when category has accessories', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        optionalDescriptionArb,
        accessoryNameArb,
        async (categoryName, categoryDesc, accessoryName) => {
          const { userId } = await createTestUser();

          // Create a custom category
          const category = await AccessoryCategoryService.create(userId, {
            name: categoryName,
            description: categoryDesc,
          });

          // Create an accessory under this category
          await AccessoryService.create(userId, {
            categoryId: category.id,
            name: accessoryName,
          });

          // Attempt to delete the category should fail
          await expect(AccessoryCategoryService.delete(userId, category.id)).rejects.toThrow(
            'Category has accessories'
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should allow deletion when category has no accessories', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        optionalDescriptionArb,
        async (categoryName, categoryDesc) => {
          const { userId } = await createTestUser();

          // Create a custom category
          const category = await AccessoryCategoryService.create(userId, {
            name: categoryName,
            description: categoryDesc,
          });

          // Delete should succeed when no accessories exist
          await AccessoryCategoryService.delete(userId, category.id);

          // Verify category is deleted
          const allCategories = await AccessoryCategoryService.findAllByUser(userId);
          const found = allCategories.find((c) => c.id === category.id);
          expect(found).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not allow deletion of preset categories', async () => {
    const { userId } = await createTestUser();

    // Get preset categories
    const presetCategories = await AccessoryCategoryService.getPresetCategories();
    expect(presetCategories.length).toBeGreaterThan(0);

    // Attempt to delete a preset category should fail
    const presetCategory = presetCategories[0];
    await expect(AccessoryCategoryService.delete(userId, presetCategory.id)).rejects.toThrow(
      'Cannot delete preset category'
    );
  });
});

describe('Category Service Basic Operations', () => {
  it('should return preset categories', async () => {
    const presetCategories = await AccessoryCategoryService.getPresetCategories();

    expect(presetCategories.length).toBe(6);
    expect(presetCategories.every((c) => c.isPreset === true)).toBe(true);
    expect(presetCategories.every((c) => c.userId === null)).toBe(true);
  });

  it('should return both preset and custom categories for user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(categoryNameArb, { minLength: 1, maxLength: 3 }),
        async (categoryNames) => {
          const { userId } = await createTestUser();
          const uniqueNames = [...new Set(categoryNames)];

          // Create custom categories
          for (const name of uniqueNames) {
            await AccessoryCategoryService.create(userId, { name });
          }

          // Get all categories for user
          const allCategories = await AccessoryCategoryService.findAllByUser(userId);

          // Should include 6 preset + custom categories
          expect(allCategories.length).toBe(6 + uniqueNames.length);

          // Verify preset categories are included
          const presetCount = allCategories.filter((c) => c.isPreset).length;
          expect(presetCount).toBe(6);

          // Verify custom categories are included
          const customCount = allCategories.filter((c) => !c.isPreset).length;
          expect(customCount).toBe(uniqueNames.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not allow duplicate category names for same user', async () => {
    await fc.assert(
      fc.asyncProperty(categoryNameArb, async (categoryName) => {
        const { userId } = await createTestUser();

        // Create first category
        await AccessoryCategoryService.create(userId, { name: categoryName });

        // Attempt to create duplicate should fail
        await expect(
          AccessoryCategoryService.create(userId, { name: categoryName })
        ).rejects.toThrow('Category already exists');
      }),
      { numRuns: 50 }
    );
  });
});
