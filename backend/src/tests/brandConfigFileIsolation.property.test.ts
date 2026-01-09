/**
 * Property-Based Tests for Brand Config File User Data Isolation
 * Feature: brand-config-files, Property 6: 用户数据隔离
 * Validates: Requirements 3.3, 4.3, 5.1
 *
 * Property: For any two different users A and B, files uploaded by user A
 * should not appear in user B's query results, and user B should not be
 * able to download or delete user A's files.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import { BrandConfigFileService } from '../services/brandConfigFile.service';
import { BrandService } from '../services/brand.service';
import { AuthService } from '../services/auth.service';
import { FileStorageService } from '../services/fileStorage.service';

// 测试后清理目录
const TEST_BASE_DIR = FileStorageService.getBaseDir();

afterAll(async () => {
  // 清理测试生成的文件
  if (fs.existsSync(TEST_BASE_DIR)) {
    await fs.promises.rm(TEST_BASE_DIR, { recursive: true, force: true });
  }
});

// Arbitrary for generating valid file names
const validFileNameArb = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,15}$/),
    fc.constantFrom('.txt', '.json', '.xml', '.ini')
  )
  .map(([name, ext]) => `${name}${ext}`);

// Arbitrary for generating file content
const fileContentArb = fc.uint8Array({ minLength: 1, maxLength: 1000 });

// Arbitrary for generating valid brand names
const validBrandNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,15}$/);

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

// Helper to create a test brand
async function createTestBrand(userId: string, name: string): Promise<string> {
  const brand = await BrandService.create(userId, { name });
  return brand.id;
}

describe('Property 6: 用户数据隔离', () => {
  /**
   * Property: Files uploaded by user A should not appear in user B's query results.
   */
  it('should isolate file lists between users', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validBrandNameArb,
        validFileNameArb,
        fileContentArb,
        async (brandNameA, brandNameB, fileName, content) => {
          // Create two users
          const userA = await createTestUser('A');
          const userB = await createTestUser('B');

          // Create brands for each user
          const brandIdA = await createTestBrand(userA.userId, brandNameA);
          const brandIdB = await createTestBrand(userB.userId, brandNameB);

          const fileBuffer = Buffer.from(content);

          // User A uploads a file
          const uploadedFile = await BrandConfigFileService.upload(userA.userId, brandIdA, {
            originalname: fileName,
            size: fileBuffer.length,
            buffer: fileBuffer,
          });

          // User A should see the file
          const filesA = await BrandConfigFileService.findByBrand(userA.userId, brandIdA);
          expect(filesA.some((f) => f.id === uploadedFile.id)).toBe(true);

          // User B should not see user A's file in their brand
          const filesB = await BrandConfigFileService.findByBrand(userB.userId, brandIdB);
          expect(filesB.some((f) => f.id === uploadedFile.id)).toBe(false);

          // User B should not be able to access user A's brand files
          await expect(BrandConfigFileService.findByBrand(userB.userId, brandIdA)).rejects.toThrow(
            'Brand not found'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User B should not be able to download user A's files.
   */
  it('should prevent cross-user file download', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validFileNameArb,
        fileContentArb,
        async (brandName, fileName, content) => {
          // Create two users
          const userA = await createTestUser('A');
          const userB = await createTestUser('B');

          // User A creates a brand and uploads a file
          const brandIdA = await createTestBrand(userA.userId, brandName);
          const fileBuffer = Buffer.from(content);

          const uploadedFile = await BrandConfigFileService.upload(userA.userId, brandIdA, {
            originalname: fileName,
            size: fileBuffer.length,
            buffer: fileBuffer,
          });

          // User A should be able to get file path
          const filePathA = await BrandConfigFileService.getFilePath(userA.userId, uploadedFile.id);
          expect(filePathA.fileName).toBe(fileName);

          // User B should not be able to get file path
          await expect(
            BrandConfigFileService.getFilePath(userB.userId, uploadedFile.id)
          ).rejects.toThrow('File not found');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User B should not be able to delete user A's files.
   */
  it('should prevent cross-user file deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validFileNameArb,
        fileContentArb,
        async (brandName, fileName, content) => {
          // Create two users
          const userA = await createTestUser('A');
          const userB = await createTestUser('B');

          // User A creates a brand and uploads a file
          const brandIdA = await createTestBrand(userA.userId, brandName);
          const fileBuffer = Buffer.from(content);

          const uploadedFile = await BrandConfigFileService.upload(userA.userId, brandIdA, {
            originalname: fileName,
            size: fileBuffer.length,
            buffer: fileBuffer,
          });

          // User B should not be able to delete user A's file
          await expect(
            BrandConfigFileService.delete(userB.userId, uploadedFile.id)
          ).rejects.toThrow('File not found');

          // Verify file still exists for user A
          const fileInfo = await BrandConfigFileService.findById(userA.userId, uploadedFile.id);
          expect(fileInfo).not.toBeNull();
          expect(fileInfo?.id).toBe(uploadedFile.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
