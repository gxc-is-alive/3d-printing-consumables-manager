/**
 * Property-Based Tests for Accessory Service
 * Feature: printer-accessories
 *
 * Property 1: 创建配件返回完整数据
 * Property 2: 必填字段验证
 * Property 3: 列表查询完整性
 * Property 4: 筛选功能正确性
 * Property 5: 更新记录 Round-Trip
 * Property 6: 删除移除记录
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 4.2, 5.2
 */

import * as fc from 'fast-check';
import { AccessoryService } from '../services/accessory.service';
import { AccessoryCategoryService } from '../services/accessoryCategory.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating accessory names
const accessoryNameArb = fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5]{2,30}$/);

// Arbitrary for generating optional brand
const optionalBrandArb = fc.option(fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5]{2,20}$/), {
  nil: undefined,
});

// Arbitrary for generating optional model
const optionalModelArb = fc.option(fc.stringMatching(/^[A-Za-z0-9\-]{2,20}$/), { nil: undefined });

// Arbitrary for generating optional price
const optionalPriceArb = fc.option(fc.float({ min: 0.01, max: 10000, noNaN: true }), {
  nil: undefined,
});

// Arbitrary for generating quantity
const quantityArb = fc.integer({ min: 1, max: 100 });

// Arbitrary for generating optional notes
const optionalNotesArb = fc.option(fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5 .,!?]{5,200}$/), {
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

describe('Property 1 & 2: 创建配件返回完整数据 & 必填字段验证', () => {
  /**
   * Property 1: For any valid accessory data, creating should return complete data.
   * Property 2: Missing name or categoryId should be rejected.
   */
  it('should return complete data on successful creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        accessoryNameArb,
        optionalBrandArb,
        optionalModelArb,
        optionalPriceArb,
        quantityArb,
        optionalNotesArb,
        async (name, brand, model, price, quantity, notes) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();

          const result = await AccessoryService.create(userId, {
            categoryId,
            name,
            brand,
            model,
            price,
            quantity,
            notes,
          });

          // Verify response contains all required fields
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.userId).toBe(userId);
          expect(result.categoryId).toBe(categoryId);
          expect(result.name).toBe(name);
          expect(result.brand).toBe(brand ?? null);
          expect(result.model).toBe(model ?? null);
          expect(result.quantity).toBe(quantity);
          expect(result.remainingQty).toBe(quantity);
          expect(result.status).toBe('available');
          expect(result.notes).toBe(notes ?? null);
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject creation without name', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    await expect(
      AccessoryService.create(userId, {
        categoryId,
        name: '',
      })
    ).rejects.toThrow('Name is required');

    await expect(
      AccessoryService.create(userId, {
        categoryId,
        name: '   ',
      })
    ).rejects.toThrow('Name is required');
  });

  it('should reject creation without categoryId', async () => {
    const { userId } = await createTestUser();

    await expect(
      AccessoryService.create(userId, {
        categoryId: '',
        name: 'Test Accessory',
      })
    ).rejects.toThrow('Category is required');
  });

  it('should reject creation with invalid categoryId', async () => {
    const { userId } = await createTestUser();

    await expect(
      AccessoryService.create(userId, {
        categoryId: 'non-existent-id',
        name: 'Test Accessory',
      })
    ).rejects.toThrow('Category not found');
  });
});

describe('Property 3 & 4: 列表查询完整性 & 筛选功能正确性', () => {
  /**
   * Property 3: Query should return all created accessories.
   * Property 4: Filtering should return only matching accessories.
   */
  it('should return all accessories for user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(accessoryNameArb, { minLength: 1, maxLength: 5 }),
        async (names) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();
          const uniqueNames = [...new Set(names)];

          // Create multiple accessories
          const createdAccessories = [];
          for (const name of uniqueNames) {
            const accessory = await AccessoryService.create(userId, {
              categoryId,
              name,
            });
            createdAccessories.push(accessory);
          }

          // Query all accessories
          const allAccessories = await AccessoryService.findAllByUser(userId);

          // Verify all created accessories are in the list
          expect(allAccessories.length).toBe(createdAccessories.length);

          for (const created of createdAccessories) {
            const found = allAccessories.find((a) => a.id === created.id);
            expect(found).toBeDefined();
            expect(found?.name).toBe(created.name);
            expect(found?.category).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should filter by categoryId', async () => {
    const { userId } = await createTestUser();
    const categories = await AccessoryCategoryService.getPresetCategories();
    const category1 = categories[0].id;
    const category2 = categories[1].id;

    // Create accessories in different categories
    await AccessoryService.create(userId, { categoryId: category1, name: 'Accessory 1' });
    await AccessoryService.create(userId, { categoryId: category1, name: 'Accessory 2' });
    await AccessoryService.create(userId, { categoryId: category2, name: 'Accessory 3' });

    // Filter by category1
    const filtered = await AccessoryService.findAllByUser(userId, { categoryId: category1 });

    expect(filtered.length).toBe(2);
    expect(filtered.every((a) => a.categoryId === category1)).toBe(true);
  });

  it('should filter by status', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessories with different statuses
    const accessory1 = await AccessoryService.create(userId, {
      categoryId,
      name: 'Available Accessory',
      quantity: 10,
    });
    const accessory2 = await AccessoryService.create(userId, {
      categoryId,
      name: 'Low Stock Accessory',
      quantity: 2,
      lowStockThreshold: 5,
    });

    // Use all quantity to make it depleted
    await AccessoryService.recordUsage(userId, accessory1.id, {
      usageDate: new Date(),
      quantity: 10,
    });

    // Filter by depleted status
    const depletedAccessories = await AccessoryService.findAllByUser(userId, {
      status: 'depleted',
    });
    expect(depletedAccessories.length).toBe(1);
    expect(depletedAccessories[0].id).toBe(accessory1.id);

    // Filter by low_stock status
    const lowStockAccessories = await AccessoryService.findAllByUser(userId, {
      status: 'low_stock',
    });
    expect(lowStockAccessories.length).toBe(1);
    expect(lowStockAccessories[0].id).toBe(accessory2.id);
  });
});

describe('Property 5: 更新记录 Round-Trip', () => {
  /**
   * Property: For any existing accessory, updating and then querying should
   * return the updated values.
   */
  it('should persist updates correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        accessoryNameArb,
        accessoryNameArb,
        optionalBrandArb,
        optionalNotesArb,
        async (originalName, newName, newBrand, newNotes) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();

          // Create accessory
          const created = await AccessoryService.create(userId, {
            categoryId,
            name: originalName,
          });

          // Update accessory
          const updated = await AccessoryService.update(userId, created.id, {
            name: newName,
            brand: newBrand,
            notes: newNotes,
          });

          // Verify update returned correct data
          expect(updated.id).toBe(created.id);
          expect(updated.name).toBe(newName);
          expect(updated.brand).toBe(newBrand ?? null);
          expect(updated.notes).toBe(newNotes ?? null);

          // Retrieve and verify persistence
          const retrieved = await AccessoryService.findById(userId, created.id);
          expect(retrieved.name).toBe(newName);
          expect(retrieved.brand).toBe(newBrand ?? null);
          expect(retrieved.notes).toBe(newNotes ?? null);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 6: 删除移除记录', () => {
  /**
   * Property: For any existing accessory, deletion should remove it from the database.
   */
  it('should remove accessory on delete', async () => {
    await fc.assert(
      fc.asyncProperty(accessoryNameArb, async (name) => {
        const { userId } = await createTestUser();
        const categoryId = await getPresetCategory();

        // Create accessory
        const created = await AccessoryService.create(userId, {
          categoryId,
          name,
        });

        // Verify accessory exists
        const beforeDelete = await AccessoryService.findById(userId, created.id);
        expect(beforeDelete.id).toBe(created.id);

        // Delete accessory
        await AccessoryService.delete(userId, created.id);

        // Verify accessory no longer exists
        await expect(AccessoryService.findById(userId, created.id)).rejects.toThrow(
          'Accessory not found'
        );
      }),
      { numRuns: 50 }
    );
  });
});
