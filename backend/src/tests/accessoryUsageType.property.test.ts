/**
 * Property-Based Tests for Accessory Usage Type
 * Feature: consumable-accessory-enhancements
 *
 * Property 6: 配件使用类型有效性
 * Property 7: 耐用型配件状态转换
 * Property 8: 消耗型配件数量递减
 * Property 9: 使用中配件删除保护
 * Validates: Requirements 3.1, 3.3, 3.4, 4.2, 4.4, 4.6
 */

import * as fc from 'fast-check';
import { AccessoryService, VALID_USAGE_TYPES } from '../services/accessory.service';
import { AccessoryCategoryService } from '../services/accessoryCategory.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid accessory names
const validNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,20}$/);

// Arbitrary for generating positive quantity
const positiveQuantityArb = fc.integer({ min: 1, max: 100 });

// Arbitrary for generating usage type
const usageTypeArb = fc.constantFrom('consumable', 'durable') as fc.Arbitrary<
  'consumable' | 'durable'
>;

// Helper to create a test user with category
async function createTestUserWithCategory(): Promise<{
  userId: string;
  categoryId: string;
}> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  const userId = result.user.id;

  const category = await AccessoryCategoryService.create(userId, {
    name: `TestCategory${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  return { userId, categoryId: category.id };
}

describe('Feature: consumable-accessory-enhancements, Property 6: 配件使用类型有效性', () => {
  /**
   * Property 6: 对于任意配件记录，usageType字段的值必须是"consumable"或"durable"之一。
   * Validates: Requirements 3.1
   */
  it('should only accept valid usage types (consumable or durable)', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, usageTypeArb, async (name, usageType) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType,
        });

        expect(VALID_USAGE_TYPES).toContain(accessory.usageType);
        expect(accessory.usageType).toBe(usageType);
      }),
      { numRuns: 100 }
    );
  });

  it('should default to consumable when usageType is not specified', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          // usageType not specified
        });

        expect(accessory.usageType).toBe('consumable');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: consumable-accessory-enhancements, Property 7: 耐用型配件状态转换', () => {
  /**
   * Property 7: 对于任意usageType为"durable"的配件，调用startUsing后状态应该变为"in_use"
   * 且inUseStartedAt应该被设置；调用stopUsing后状态应该恢复为"available"且应该创建一条使用记录。
   * Validates: Requirements 3.3, 4.2, 4.4
   */
  it('should transition durable accessory to in_use status when startUsing is called', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'durable',
        });

        expect(accessory.status).toBe('available');
        expect(accessory.inUseStartedAt).toBeNull();

        const inUse = await AccessoryService.startUsing(userId, accessory.id);

        expect(inUse.status).toBe('in_use');
        expect(inUse.inUseStartedAt).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('should transition durable accessory back to available when stopUsing is called', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'durable',
        });

        // Start using
        await AccessoryService.startUsing(userId, accessory.id);

        // Stop using
        const stopped = await AccessoryService.stopUsing(userId, accessory.id);

        expect(stopped.status).toBe('available');
        expect(stopped.inUseStartedAt).toBeNull();

        // Should have created a usage record
        expect(stopped.usageRecords).toBeDefined();
        expect(stopped.usageRecords!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject startUsing for consumable accessories', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'consumable',
        });

        await expect(AccessoryService.startUsing(userId, accessory.id)).rejects.toThrow(
          'Only durable accessories can be marked as in use'
        );
      }),
      { numRuns: 100 }
    );
  });

  it('should reject startUsing for already in-use accessories', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'durable',
        });

        // Start using first time
        await AccessoryService.startUsing(userId, accessory.id);

        // Try to start using again
        await expect(AccessoryService.startUsing(userId, accessory.id)).rejects.toThrow(
          'Accessory is already in use'
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: consumable-accessory-enhancements, Property 8: 消耗型配件数量递减', () => {
  /**
   * Property 8: 对于任意usageType为"consumable"的配件，记录使用后remainingQty应该减少相应的数量，
   * 且状态应该根据剩余数量和阈值正确更新。
   * Validates: Requirements 3.4
   */
  it('should decrease remainingQty when recording usage for consumable accessories', async () => {
    await fc.assert(
      fc.asyncProperty(
        validNameArb,
        positiveQuantityArb,
        fc.integer({ min: 1, max: 10 }),
        async (name, initialQty, usageQty) => {
          // Ensure usageQty doesn't exceed initialQty
          const actualUsageQty = Math.min(usageQty, initialQty);

          const { userId, categoryId } = await createTestUserWithCategory();

          const accessory = await AccessoryService.create(userId, {
            categoryId,
            name,
            usageType: 'consumable',
            quantity: initialQty,
          });

          expect(accessory.remainingQty).toBe(initialQty);

          const afterUsage = await AccessoryService.recordUsage(userId, accessory.id, {
            usageDate: new Date(),
            quantity: actualUsageQty,
          });

          expect(afterUsage.remainingQty).toBe(initialQty - actualUsageQty);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update status to depleted when remainingQty reaches 0', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'consumable',
          quantity: 1,
        });

        const afterUsage = await AccessoryService.recordUsage(userId, accessory.id, {
          usageDate: new Date(),
          quantity: 1,
        });

        expect(afterUsage.remainingQty).toBe(0);
        expect(afterUsage.status).toBe('depleted');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: consumable-accessory-enhancements, Property 9: 使用中配件删除保护', () => {
  /**
   * Property 9: 对于任意状态为"in_use"的配件，删除操作应该失败并返回错误。
   * Validates: Requirements 4.6
   */
  it('should reject deletion of in-use accessories', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'durable',
        });

        // Start using
        await AccessoryService.startUsing(userId, accessory.id);

        // Try to delete
        await expect(AccessoryService.delete(userId, accessory.id)).rejects.toThrow(
          'Cannot delete accessory that is in use'
        );

        // Verify accessory still exists
        const stillExists = await AccessoryService.findById(userId, accessory.id);
        expect(stillExists).toBeDefined();
        expect(stillExists.id).toBe(accessory.id);
      }),
      { numRuns: 100 }
    );
  });

  it('should allow deletion of available accessories', async () => {
    await fc.assert(
      fc.asyncProperty(validNameArb, async (name) => {
        const { userId, categoryId } = await createTestUserWithCategory();

        const accessory = await AccessoryService.create(userId, {
          categoryId,
          name,
          usageType: 'durable',
        });

        expect(accessory.status).toBe('available');

        // Should be able to delete
        await AccessoryService.delete(userId, accessory.id);

        // Verify accessory is deleted
        await expect(AccessoryService.findById(userId, accessory.id)).rejects.toThrow(
          'Accessory not found'
        );
      }),
      { numRuns: 100 }
    );
  });
});
