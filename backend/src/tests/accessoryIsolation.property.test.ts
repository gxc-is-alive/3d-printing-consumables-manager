/**
 * Property-Based Tests for Accessory Data Isolation
 * Feature: printer-accessories
 *
 * Property 11: 用户数据隔离
 *
 * Validates: Requirements 8.1, 8.2
 */

import * as fc from 'fast-check';
import { AccessoryService } from '../services/accessory.service';
import { AccessoryCategoryService } from '../services/accessoryCategory.service';
import { AuthService } from '../services/auth.service';

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

// Helper to get a preset category
async function getPresetCategory(): Promise<string> {
  const categories = await AccessoryCategoryService.getPresetCategories();
  return categories[0].id;
}

describe('Property 11: 用户数据隔离', () => {
  /**
   * Property: User A's accessories should not appear in User B's query results,
   * and User B should not be able to access, modify, or delete User A's accessories.
   */
  it('should isolate accessory lists between users', async () => {
    await fc.assert(
      fc.asyncProperty(accessoryNameArb, async (name) => {
        const userA = await createTestUser();
        const userB = await createTestUser();
        const categoryId = await getPresetCategory();

        // User A creates an accessory
        const accessoryA = await AccessoryService.create(userA.userId, {
          categoryId,
          name,
        });

        // User B's list should not contain User A's accessory
        const userBAccessories = await AccessoryService.findAllByUser(userB.userId);
        const found = userBAccessories.find((a) => a.id === accessoryA.id);
        expect(found).toBeUndefined();

        // User A's list should contain the accessory
        const userAAccessories = await AccessoryService.findAllByUser(userA.userId);
        const foundA = userAAccessories.find((a) => a.id === accessoryA.id);
        expect(foundA).toBeDefined();
      }),
      { numRuns: 50 }
    );
  });

  it('should prevent cross-user accessory access', async () => {
    await fc.assert(
      fc.asyncProperty(accessoryNameArb, async (name) => {
        const userA = await createTestUser();
        const userB = await createTestUser();
        const categoryId = await getPresetCategory();

        // User A creates an accessory
        const accessoryA = await AccessoryService.create(userA.userId, {
          categoryId,
          name,
        });

        // User B should not be able to access User A's accessory
        await expect(AccessoryService.findById(userB.userId, accessoryA.id)).rejects.toThrow(
          'Accessory not found'
        );
      }),
      { numRuns: 50 }
    );
  });

  it('should prevent cross-user accessory modification', async () => {
    await fc.assert(
      fc.asyncProperty(accessoryNameArb, accessoryNameArb, async (originalName, newName) => {
        const userA = await createTestUser();
        const userB = await createTestUser();
        const categoryId = await getPresetCategory();

        // User A creates an accessory
        const accessoryA = await AccessoryService.create(userA.userId, {
          categoryId,
          name: originalName,
        });

        // User B should not be able to update User A's accessory
        await expect(
          AccessoryService.update(userB.userId, accessoryA.id, { name: newName })
        ).rejects.toThrow('Accessory not found');

        // Verify accessory is unchanged
        const unchanged = await AccessoryService.findById(userA.userId, accessoryA.id);
        expect(unchanged.name).toBe(originalName);
      }),
      { numRuns: 50 }
    );
  });

  it('should prevent cross-user accessory deletion', async () => {
    await fc.assert(
      fc.asyncProperty(accessoryNameArb, async (name) => {
        const userA = await createTestUser();
        const userB = await createTestUser();
        const categoryId = await getPresetCategory();

        // User A creates an accessory
        const accessoryA = await AccessoryService.create(userA.userId, {
          categoryId,
          name,
        });

        // User B should not be able to delete User A's accessory
        await expect(AccessoryService.delete(userB.userId, accessoryA.id)).rejects.toThrow(
          'Accessory not found'
        );

        // Verify accessory still exists
        const stillExists = await AccessoryService.findById(userA.userId, accessoryA.id);
        expect(stillExists).toBeDefined();
      }),
      { numRuns: 50 }
    );
  });

  it('should prevent cross-user usage recording', async () => {
    await fc.assert(
      fc.asyncProperty(accessoryNameArb, async (name) => {
        const userA = await createTestUser();
        const userB = await createTestUser();
        const categoryId = await getPresetCategory();

        // User A creates an accessory
        const accessoryA = await AccessoryService.create(userA.userId, {
          categoryId,
          name,
          quantity: 10,
        });

        // User B should not be able to record usage on User A's accessory
        await expect(
          AccessoryService.recordUsage(userB.userId, accessoryA.id, {
            usageDate: new Date(),
            quantity: 1,
          })
        ).rejects.toThrow('Accessory not found');

        // Verify quantity is unchanged
        const unchanged = await AccessoryService.findById(userA.userId, accessoryA.id);
        expect(unchanged.remainingQty).toBe(10);
      }),
      { numRuns: 50 }
    );
  });
});
