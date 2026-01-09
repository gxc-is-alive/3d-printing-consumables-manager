/**
 * Property-Based Tests for Accessory Alerts Service
 * Feature: printer-accessories
 *
 * Property 9: 更换周期提醒计算
 * Property 10: 库存不足提醒计算
 *
 * Validates: Requirements 7.1, 7.2
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

describe('Property 9: 更换周期提醒计算', () => {
  /**
   * Property: If replacement cycle is set and time since last replacement exceeds cycle,
   * the accessory should appear in alerts.
   */
  it('should generate replacement alert when cycle exceeded', async () => {
    await fc.assert(
      fc.asyncProperty(
        accessoryNameArb,
        fc.integer({ min: 1, max: 30 }),
        async (name, replacementCycle) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();

          // Create accessory with replacement cycle
          const accessory = await AccessoryService.create(userId, {
            categoryId,
            name,
            replacementCycle,
          });

          // Set lastReplacedAt to a date that exceeds the cycle
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - replacementCycle - 1);

          await AccessoryService.update(userId, accessory.id, {
            lastReplacedAt: pastDate,
          });

          // Get alerts
          const alerts = await AccessoryService.getAlerts(userId);

          // Should have a replacement alert
          const replacementAlert = alerts.find(
            (a) => a.accessoryId === accessory.id && a.alertType === 'replacement_due'
          );
          expect(replacementAlert).toBeDefined();
          expect(replacementAlert?.accessoryName).toBe(name);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not generate replacement alert when cycle not exceeded', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessory with 30-day replacement cycle
    const accessory = await AccessoryService.create(userId, {
      categoryId,
      name: 'Test Accessory',
      replacementCycle: 30,
    });

    // Set lastReplacedAt to yesterday (within cycle)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await AccessoryService.update(userId, accessory.id, {
      lastReplacedAt: yesterday,
    });

    // Get alerts
    const alerts = await AccessoryService.getAlerts(userId);

    // Should not have a replacement alert
    const replacementAlert = alerts.find(
      (a) => a.accessoryId === accessory.id && a.alertType === 'replacement_due'
    );
    expect(replacementAlert).toBeUndefined();
  });
});

describe('Property 10: 库存不足提醒计算', () => {
  /**
   * Property: If remaining quantity is below threshold or zero,
   * the accessory should appear in alerts.
   */
  it('should generate low stock alert when below threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        accessoryNameArb,
        fc.integer({ min: 5, max: 10 }),
        fc.integer({ min: 3, max: 4 }),
        async (name, threshold, remaining) => {
          const { userId } = await createTestUser();
          const categoryId = await getPresetCategory();

          // Create accessory with threshold
          const accessory = await AccessoryService.create(userId, {
            categoryId,
            name,
            quantity: 10,
            lowStockThreshold: threshold,
          });

          // Use some to get below threshold
          const usageQty = 10 - remaining;
          await AccessoryService.recordUsage(userId, accessory.id, {
            usageDate: new Date(),
            quantity: usageQty,
          });

          // Get alerts
          const alerts = await AccessoryService.getAlerts(userId);

          // Should have a low stock alert
          const stockAlert = alerts.find(
            (a) => a.accessoryId === accessory.id && a.alertType === 'low_stock'
          );
          expect(stockAlert).toBeDefined();
          expect(stockAlert?.accessoryName).toBe(name);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should generate depleted alert when quantity is zero', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessory
    const accessory = await AccessoryService.create(userId, {
      categoryId,
      name: 'Test Accessory',
      quantity: 5,
    });

    // Use all quantity
    await AccessoryService.recordUsage(userId, accessory.id, {
      usageDate: new Date(),
      quantity: 5,
    });

    // Get alerts
    const alerts = await AccessoryService.getAlerts(userId);

    // Should have a low stock alert (depleted)
    const stockAlert = alerts.find(
      (a) => a.accessoryId === accessory.id && a.alertType === 'low_stock'
    );
    expect(stockAlert).toBeDefined();
    expect(stockAlert?.message).toContain('已用完');
  });

  it('should not generate alert when stock is sufficient', async () => {
    const { userId } = await createTestUser();
    const categoryId = await getPresetCategory();

    // Create accessory with threshold
    const accessory = await AccessoryService.create(userId, {
      categoryId,
      name: 'Test Accessory',
      quantity: 10,
      lowStockThreshold: 3,
    });

    // Get alerts (should be empty for this accessory)
    const alerts = await AccessoryService.getAlerts(userId);

    const stockAlert = alerts.find(
      (a) => a.accessoryId === accessory.id && a.alertType === 'low_stock'
    );
    expect(stockAlert).toBeUndefined();
  });
});
