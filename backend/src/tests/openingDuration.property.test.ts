/**
 * Property-Based Tests for Opening Status Duration Calculation
 * Feature: 3d-printing-consumables-manager, Property 8: Opening Status Duration Calculation
 * Validates: Requirements 6.1, 6.4
 *
 * Property: For any opened consumable with openedAt timestamp T, the duration since opening
 * should equal the difference between current time and T.
 */

import * as fc from 'fast-check';
import { calculateOpenedDays } from '../services/consumable.service';
import { ConsumableService } from '../services/consumable.service';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

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

  const brand = await BrandService.create(userId, {
    name: `TestBrand${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  const type = await ConsumableTypeService.create(userId, {
    name: `TestType${Date.now()}${Math.random().toString(36).slice(2)}`,
  });

  return { userId, brandId: brand.id, typeId: type.id };
}

describe('Property 8: Opening Status Duration Calculation', () => {
  /**
   * Property: For any openedAt date in the past, calculateOpenedDays should return
   * the correct number of days between openedAt and the reference date.
   */
  it('should calculate correct days since opening for any past date', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate days ago (0 to 365 days)
        fc.integer({ min: 0, max: 365 }),
        async (daysAgo) => {
          const now = new Date();
          const openedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

          const calculatedDays = calculateOpenedDays(openedAt, now);

          expect(calculatedDays).toBe(daysAgo);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For null openedAt, calculateOpenedDays should return null.
   */
  it('should return null for unopened consumables (null openedAt)', async () => {
    const result = calculateOpenedDays(null);
    expect(result).toBeNull();
  });

  /**
   * Property: For any opened consumable, the openedDays field should match
   * the calculated duration from openedAt to now.
   */
  it('should include correct openedDays in consumable response after marking as opened', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate days ago (0 to 30 days for practical testing)
        fc.integer({ min: 0, max: 30 }),
        async (daysAgo) => {
          const { userId, brandId, typeId } = await createTestUserWithDependencies();

          // Create consumable
          const created = await ConsumableService.create(userId, {
            brandId,
            typeId,
            color: 'Red',
            weight: 1000,
            price: 50,
            purchaseDate: new Date(),
          });

          // Verify unopened consumable has null openedDays
          expect(created.openedDays).toBeNull();

          // Calculate openedAt date
          const openedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

          // Mark as opened with specific date
          const opened = await ConsumableService.markAsOpened(userId, created.id, openedAt);

          // Verify openedDays is calculated correctly
          expect(opened.isOpened).toBe(true);
          expect(opened.openedDays).not.toBeNull();
          expect(opened.openedDays).toBe(daysAgo);

          // Retrieve and verify persistence
          const retrieved = await ConsumableService.findById(userId, created.id);
          expect(retrieved.openedDays).toBe(daysAgo);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Opening duration should be non-negative for any valid openedAt date.
   */
  it('should always return non-negative duration', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate any date within reasonable range
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        async (openedAt, referenceDate) => {
          const calculatedDays = calculateOpenedDays(openedAt, referenceDate);

          expect(calculatedDays).not.toBeNull();
          expect(calculatedDays).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: For consumables in findAllByUser, opened ones should have openedDays,
   * unopened ones should have null openedDays.
   */
  it('should correctly include openedDays in list results', async () => {
    const { userId, brandId, typeId } = await createTestUserWithDependencies();

    // Create two consumables
    const unopened = await ConsumableService.create(userId, {
      brandId,
      typeId,
      color: 'Blue',
      weight: 1000,
      price: 50,
      purchaseDate: new Date(),
    });

    const toBeOpened = await ConsumableService.create(userId, {
      brandId,
      typeId,
      color: 'Green',
      weight: 1000,
      price: 50,
      purchaseDate: new Date(),
    });

    // Mark one as opened 5 days ago
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await ConsumableService.markAsOpened(userId, toBeOpened.id, fiveDaysAgo);

    // Get all consumables
    const all = await ConsumableService.findAllByUser(userId);

    // Find each consumable in results
    const unopenedResult = all.find((c) => c.id === unopened.id);
    const openedResult = all.find((c) => c.id === toBeOpened.id);

    expect(unopenedResult).toBeDefined();
    expect(unopenedResult?.openedDays).toBeNull();
    expect(unopenedResult?.isOpened).toBe(false);

    expect(openedResult).toBeDefined();
    expect(openedResult?.openedDays).toBe(5);
    expect(openedResult?.isOpened).toBe(true);
  });
});
