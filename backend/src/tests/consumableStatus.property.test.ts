/**
 * 耗材状态管理属性测试
 *
 * **Validates: Requirements 1, 2, 3**
 *
 * 测试耗材状态转换和筛选功能的正确性
 */

import * as fc from 'fast-check';
import { ConsumableService } from '../services/consumable.service';
import { prisma } from '../db';

describe('Consumable Status Property Tests', () => {
  let testUserId: string;
  let testBrandId: string;
  let testTypeId: string;

  beforeEach(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: `status-test-${Date.now()}-${Math.random()}@test.com`,
        passwordHash: 'test-hash',
        name: 'Status Test User',
      },
    });
    testUserId = user.id;

    // 创建测试品牌
    const brand = await prisma.brand.create({
      data: {
        userId: testUserId,
        name: `Test Brand ${Date.now()}`,
      },
    });
    testBrandId = brand.id;

    // 创建测试类型
    const type = await prisma.consumableType.create({
      data: {
        userId: testUserId,
        name: `Test Type ${Date.now()}`,
      },
    });
    testTypeId = type.id;
  });

  afterEach(async () => {
    // 清理测试数据
    if (testUserId) {
      await prisma.consumable.deleteMany({ where: { userId: testUserId } });
      await prisma.brand.deleteMany({ where: { userId: testUserId } });
      await prisma.consumableType.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  /**
   * **Validates: Requirement 1.1**
   *
   * 属性：新创建的耗材状态应该与 isOpened 字段一致
   */
  test('Property: New consumable status matches isOpened field', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (isOpened) => {
        const result = await ConsumableService.batchCreate(testUserId, {
          brandId: testBrandId,
          typeId: testTypeId,
          color: 'Test Color',
          weight: 1000,
          price: 100,
          purchaseDate: new Date(),
          quantity: 1,
          isOpened,
        });

        const consumable = result.consumables[0];

        // 清理
        await prisma.consumable.delete({ where: { id: consumable.id } });

        // 验证状态一致性
        if (isOpened) {
          return consumable.status === 'opened' && consumable.isOpened === true;
        } else {
          return consumable.status === 'unopened' && consumable.isOpened === false;
        }
      }),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirement 2.3, 2.4**
   *
   * 属性：标记为已用完后，状态应为 depleted，剩余重量应为 0
   */
  test('Property: Mark as depleted sets correct status and weight', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 100, max: 5000 }), async (initialWeight) => {
        // 创建已开封的耗材
        const result = await ConsumableService.batchCreate(testUserId, {
          brandId: testBrandId,
          typeId: testTypeId,
          color: 'Test Color',
          weight: initialWeight,
          price: 100,
          purchaseDate: new Date(),
          quantity: 1,
          isOpened: true,
        });

        const consumable = result.consumables[0];

        // 标记为已用完
        const depleted = await ConsumableService.markAsDepleted(testUserId, consumable.id);

        // 清理
        await prisma.consumable.delete({ where: { id: consumable.id } });

        // 验证
        return (
          depleted.status === 'depleted' &&
          depleted.remainingWeight === 0 &&
          depleted.depletedAt !== null
        );
      }),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirement 2.5**
   *
   * 属性：恢复已用完的耗材后，状态应为 opened
   */
  test('Property: Restore from depleted sets status to opened', async () => {
    // 创建已开封的耗材
    const result = await ConsumableService.batchCreate(testUserId, {
      brandId: testBrandId,
      typeId: testTypeId,
      color: 'Test Color',
      weight: 1000,
      price: 100,
      purchaseDate: new Date(),
      quantity: 1,
      isOpened: true,
    });

    const consumable = result.consumables[0];

    // 标记为已用完
    await ConsumableService.markAsDepleted(testUserId, consumable.id);

    // 恢复
    const restored = await ConsumableService.restoreFromDepleted(testUserId, consumable.id);

    // 清理
    await prisma.consumable.delete({ where: { id: consumable.id } });

    // 验证
    expect(restored.status).toBe('opened');
    expect(restored.depletedAt).toBeNull();
  });

  /**
   * **Validates: Requirement 3.1**
   *
   * 属性：默认筛选不返回已用完的耗材
   */
  test('Property: Default filter excludes depleted consumables', async () => {
    // 创建多个耗材
    const openedResult = await ConsumableService.batchCreate(testUserId, {
      brandId: testBrandId,
      typeId: testTypeId,
      color: 'Opened Color',
      weight: 1000,
      price: 100,
      purchaseDate: new Date(),
      quantity: 1,
      isOpened: true,
    });

    const unopenedResult = await ConsumableService.batchCreate(testUserId, {
      brandId: testBrandId,
      typeId: testTypeId,
      color: 'Unopened Color',
      weight: 1000,
      price: 100,
      purchaseDate: new Date(),
      quantity: 1,
      isOpened: false,
    });

    // 标记一个为已用完
    await ConsumableService.markAsDepleted(testUserId, openedResult.consumables[0].id);

    // 默认筛选
    const defaultList = await ConsumableService.findAllByUser(testUserId);

    // 清理
    await prisma.consumable.delete({ where: { id: openedResult.consumables[0].id } });
    await prisma.consumable.delete({ where: { id: unopenedResult.consumables[0].id } });

    // 验证：默认列表不包含已用完的耗材
    const hasDepletedInDefault = defaultList.some((c) => c.status === 'depleted');
    expect(hasDepletedInDefault).toBe(false);
  });

  /**
   * **Validates: Requirement 3.2**
   *
   * 属性：includeDepleted=true 时返回已用完的耗材
   */
  test('Property: includeDepleted filter includes depleted consumables', async () => {
    // 创建已开封的耗材
    const result = await ConsumableService.batchCreate(testUserId, {
      brandId: testBrandId,
      typeId: testTypeId,
      color: 'Test Color',
      weight: 1000,
      price: 100,
      purchaseDate: new Date(),
      quantity: 1,
      isOpened: true,
    });

    const consumable = result.consumables[0];

    // 标记为已用完
    await ConsumableService.markAsDepleted(testUserId, consumable.id);

    // 使用 includeDepleted 筛选
    const listWithDepleted = await ConsumableService.findAllByUser(testUserId, {
      includeDepleted: true,
    });

    // 清理
    await prisma.consumable.delete({ where: { id: consumable.id } });

    // 验证：列表包含已用完的耗材
    const hasDepletedInList = listWithDepleted.some(
      (c) => c.id === consumable.id && c.status === 'depleted'
    );
    expect(hasDepletedInList).toBe(true);
  });

  /**
   * **Validates: Requirement 5.1, 5.2**
   *
   * 属性：状态筛选返回正确的耗材
   */
  test('Property: Status filter returns correct consumables', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('unopened', 'opened', 'depleted'), async (targetStatus) => {
        // 创建不同状态的耗材
        const unopenedResult = await ConsumableService.batchCreate(testUserId, {
          brandId: testBrandId,
          typeId: testTypeId,
          color: 'Unopened',
          weight: 1000,
          price: 100,
          purchaseDate: new Date(),
          quantity: 1,
          isOpened: false,
        });

        const openedResult = await ConsumableService.batchCreate(testUserId, {
          brandId: testBrandId,
          typeId: testTypeId,
          color: 'Opened',
          weight: 1000,
          price: 100,
          purchaseDate: new Date(),
          quantity: 1,
          isOpened: true,
        });

        // 创建已用完的耗材
        const depletedResult = await ConsumableService.batchCreate(testUserId, {
          brandId: testBrandId,
          typeId: testTypeId,
          color: 'Depleted',
          weight: 1000,
          price: 100,
          purchaseDate: new Date(),
          quantity: 1,
          isOpened: true,
        });
        await ConsumableService.markAsDepleted(testUserId, depletedResult.consumables[0].id);

        // 按状态筛选
        const filtered = await ConsumableService.findAllByUser(testUserId, {
          status: targetStatus as 'unopened' | 'opened' | 'depleted',
          includeDepleted: true,
        });

        // 清理
        await prisma.consumable.delete({ where: { id: unopenedResult.consumables[0].id } });
        await prisma.consumable.delete({ where: { id: openedResult.consumables[0].id } });
        await prisma.consumable.delete({ where: { id: depletedResult.consumables[0].id } });

        // 验证：所有返回的耗材状态都匹配
        return filtered.every((c) => c.status === targetStatus);
      }),
      { numRuns: 3 }
    );
  });

  /**
   * **Validates: Requirement 2**
   *
   * 属性：未开封的耗材不能标记为已用完
   */
  test('Property: Cannot mark unopened consumable as depleted', async () => {
    // 创建未开封的耗材
    const result = await ConsumableService.batchCreate(testUserId, {
      brandId: testBrandId,
      typeId: testTypeId,
      color: 'Unopened',
      weight: 1000,
      price: 100,
      purchaseDate: new Date(),
      quantity: 1,
      isOpened: false,
    });

    const consumable = result.consumables[0];

    // 尝试标记为已用完，应该抛出错误
    await expect(ConsumableService.markAsDepleted(testUserId, consumable.id)).rejects.toThrow(
      'Cannot mark unopened consumable as depleted'
    );

    // 清理
    await prisma.consumable.delete({ where: { id: consumable.id } });
  });

  /**
   * **Validates: Requirement 2.5**
   *
   * 属性：非已用完的耗材不能恢复
   */
  test('Property: Cannot restore non-depleted consumable', async () => {
    // 创建已开封的耗材
    const result = await ConsumableService.batchCreate(testUserId, {
      brandId: testBrandId,
      typeId: testTypeId,
      color: 'Opened',
      weight: 1000,
      price: 100,
      purchaseDate: new Date(),
      quantity: 1,
      isOpened: true,
    });

    const consumable = result.consumables[0];

    // 尝试恢复，应该抛出错误
    await expect(ConsumableService.restoreFromDepleted(testUserId, consumable.id)).rejects.toThrow(
      'Consumable is not depleted'
    );

    // 清理
    await prisma.consumable.delete({ where: { id: consumable.id } });
  });
});
