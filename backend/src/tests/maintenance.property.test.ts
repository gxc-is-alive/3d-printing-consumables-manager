/**
 * Property-Based Tests for Maintenance Record Service
 * Feature: maintenance-records
 *
 * Property 1: 创建记录返回完整数据
 * Property 3: 列表完整性与排序
 * Property 4: 更新记录 Round-Trip
 * Property 5: 删除移除记录
 *
 * Validates: Requirements 1.1, 1.5, 2.1, 2.2, 2.3, 3.2, 4.2
 */

import * as fc from 'fast-check';
import { MaintenanceService, VALID_MAINTENANCE_TYPES } from '../services/maintenance.service';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid maintenance types
const maintenanceTypeArb = fc.constantFrom(...VALID_MAINTENANCE_TYPES);

// Arbitrary for generating dates within a reasonable range
const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});

// Arbitrary for generating optional description
const optionalDescriptionArb = fc.option(
  fc.stringMatching(/^[A-Za-z0-9\u4e00-\u9fa5 .,!?]{5,100}$/),
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

describe('Property 1: 创建记录返回完整数据', () => {
  /**
   * Property: For any valid maintenance data, creating a record should return
   * a response with id, date, type, description, createdAt fields matching input.
   */
  it('should return complete data on successful creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        async (date, type, description) => {
          const { userId } = await createTestUser();

          const result = await MaintenanceService.create(userId, {
            date,
            type,
            description,
          });

          // Verify response contains all required fields
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.userId).toBe(userId);
          expect(result.date.getTime()).toBe(date.getTime());
          expect(result.type).toBe(type);
          expect(result.description).toBe(description ?? null);
          expect(result.createdAt).toBeInstanceOf(Date);
          expect(result.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: 列表完整性与排序', () => {
  /**
   * Property: For any user, querying maintenance records should return all
   * created records sorted by date in descending order (newest first).
   */
  it('should return all records sorted by date descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(dateArb, maintenanceTypeArb, optionalDescriptionArb), {
          minLength: 2,
          maxLength: 5,
        }),
        async (recordsData) => {
          const { userId } = await createTestUser();

          // Create multiple records
          const createdRecords = [];
          for (const [date, type, description] of recordsData) {
            const record = await MaintenanceService.create(userId, {
              date,
              type,
              description,
            });
            createdRecords.push(record);
          }

          // Query all records
          const allRecords = await MaintenanceService.findAllByUser(userId);

          // Verify all created records are in the list
          expect(allRecords.length).toBe(createdRecords.length);

          for (const created of createdRecords) {
            const found = allRecords.find((r) => r.id === created.id);
            expect(found).toBeDefined();
            expect(found?.type).toBe(created.type);
          }

          // Verify sorting (descending by date)
          for (let i = 1; i < allRecords.length; i++) {
            expect(allRecords[i - 1].date.getTime()).toBeGreaterThanOrEqual(
              allRecords[i].date.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: 更新记录 Round-Trip', () => {
  /**
   * Property: For any existing record, updating and then querying should
   * return the updated values.
   */
  it('should persist updates correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        async (originalDate, originalType, originalDesc, newDate, newType, newDesc) => {
          const { userId } = await createTestUser();

          // Create record
          const created = await MaintenanceService.create(userId, {
            date: originalDate,
            type: originalType,
            description: originalDesc,
          });

          // Update record
          const updated = await MaintenanceService.update(userId, created.id, {
            date: newDate,
            type: newType,
            description: newDesc,
          });

          // Verify update returned correct data
          expect(updated.id).toBe(created.id);
          expect(updated.date.getTime()).toBe(newDate.getTime());
          expect(updated.type).toBe(newType);

          // For optional fields: undefined means "don't change"
          const expectedDesc = newDesc !== undefined ? newDesc : (originalDesc ?? null);
          expect(updated.description).toBe(expectedDesc);

          // Retrieve and verify persistence
          const retrieved = await MaintenanceService.findById(userId, created.id);
          expect(retrieved.date.getTime()).toBe(newDate.getTime());
          expect(retrieved.type).toBe(newType);
          expect(retrieved.description).toBe(expectedDesc);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: 删除移除记录', () => {
  /**
   * Property: For any existing record, deletion should remove it from the database.
   */
  it('should remove record on delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateArb,
        maintenanceTypeArb,
        optionalDescriptionArb,
        async (date, type, description) => {
          const { userId } = await createTestUser();

          // Create record
          const created = await MaintenanceService.create(userId, {
            date,
            type,
            description,
          });

          // Verify record exists
          const beforeDelete = await MaintenanceService.findById(userId, created.id);
          expect(beforeDelete.id).toBe(created.id);

          // Delete record
          await MaintenanceService.delete(userId, created.id);

          // Verify record no longer exists
          await expect(MaintenanceService.findById(userId, created.id)).rejects.toThrow(
            'Record not found'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
