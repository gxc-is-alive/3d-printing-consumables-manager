/**
 * Property-Based Tests for Maintenance Record User Data Isolation
 * Feature: maintenance-records, Property 6: 用户数据隔离
 * Validates: Requirements 5.1, 5.2
 *
 * Property: For any two different users A and B, records created by user A
 * should not appear in user B's query results, and user B should not be
 * able to access, modify, or delete user A's records.
 */

import * as fc from 'fast-check';
import { MaintenanceService, VALID_MAINTENANCE_TYPES } from '../services/maintenance.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid maintenance types
const maintenanceTypeArb = fc.constantFrom(...VALID_MAINTENANCE_TYPES);

// Arbitrary for generating dates
const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});

// Arbitrary for generating optional description
const optionalDescriptionArb = fc.option(fc.stringMatching(/^[A-Za-z0-9 ]{5,50}$/), {
  nil: undefined,
});

// Helper to create a test user
async function createTestUser(suffix: string): Promise<{ userId: string; email: string }> {
  const email = `test-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: `Test User ${suffix}`,
  });
  return { userId: result.user.id, email };
}

describe('Property 6: 用户数据隔离', () => {
  /**
   * Property: Records created by user A should not appear in user B's query results.
   */
  it('should isolate record lists between users', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        async (date, type, description) => {
          // Create two users
          const userA = await createTestUser('A');
          const userB = await createTestUser('B');

          // User A creates a record
          const recordA = await MaintenanceService.create(userA.userId, {
            date,
            type,
            description,
          });

          // User A should see the record
          const recordsA = await MaintenanceService.findAllByUser(userA.userId);
          expect(recordsA.some((r) => r.id === recordA.id)).toBe(true);

          // User B should not see user A's record
          const recordsB = await MaintenanceService.findAllByUser(userB.userId);
          expect(recordsB.some((r) => r.id === recordA.id)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User B should not be able to access user A's records.
   */
  it('should prevent cross-user record access', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        async (date, type, description) => {
          // Create two users
          const userA = await createTestUser('A');
          const userB = await createTestUser('B');

          // User A creates a record
          const recordA = await MaintenanceService.create(userA.userId, {
            date,
            type,
            description,
          });

          // User A should be able to access the record
          const retrieved = await MaintenanceService.findById(userA.userId, recordA.id);
          expect(retrieved.id).toBe(recordA.id);

          // User B should not be able to access user A's record
          await expect(MaintenanceService.findById(userB.userId, recordA.id)).rejects.toThrow(
            'Record not found'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User B should not be able to modify or delete user A's records.
   */
  it('should prevent cross-user record modification and deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        async (date, type, description) => {
          // Create two users
          const userA = await createTestUser('A');
          const userB = await createTestUser('B');

          // User A creates a record
          const recordA = await MaintenanceService.create(userA.userId, {
            date,
            type,
            description,
          });

          // User B should not be able to update user A's record
          await expect(
            MaintenanceService.update(userB.userId, recordA.id, { type: 'other' })
          ).rejects.toThrow('Record not found');

          // User B should not be able to delete user A's record
          await expect(MaintenanceService.delete(userB.userId, recordA.id)).rejects.toThrow(
            'Record not found'
          );

          // Verify record still exists for user A
          const stillExists = await MaintenanceService.findById(userA.userId, recordA.id);
          expect(stillExists.id).toBe(recordA.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
