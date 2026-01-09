/**
 * Property-Based Tests for Brand Config File Service
 * Feature: brand-config-files
 *
 * Property 1: 文件上传创建数据库记录
 * Property 3: 上传返回完整元数据
 * Property 4: 文件列表完整性
 * Property 7: 删除移除文件和记录
 *
 * Validates: Requirements 1.1, 1.3, 1.5, 2.1, 2.2, 4.1
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import { BrandConfigFileService } from '../services/brandConfigFile.service';
import { BrandService } from '../services/brand.service';
import { AuthService } from '../services/auth.service';
import { FileStorageService } from '../services/fileStorage.service';
import { prisma } from '../db';

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
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
    fc.constantFrom('.txt', '.json', '.xml', '.ini', '.cfg', '.bin', '.gcode')
  )
  .map(([name, ext]) => `${name}${ext}`);

// Arbitrary for generating file content
const fileContentArb = fc.uint8Array({ minLength: 1, maxLength: 5000 });

// Arbitrary for generating valid brand names
const validBrandNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,20}$/);

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

// Helper to create a test brand
async function createTestBrand(userId: string, name: string): Promise<string> {
  const brand = await BrandService.create(userId, { name });
  return brand.id;
}

describe('Property 1: 文件上传创建数据库记录', () => {
  /**
   * Property: For any valid file and brand ID, uploading should create
   * a database record with matching brandId, fileName, and fileSize.
   */
  it('should create database record with correct metadata on upload', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validFileNameArb,
        fileContentArb,
        async (brandName, fileName, content) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId, brandName);
          const fileBuffer = Buffer.from(content);

          const result = await BrandConfigFileService.upload(userId, brandId, {
            originalname: fileName,
            size: fileBuffer.length,
            buffer: fileBuffer,
          });

          // Verify database record exists
          const dbRecord = await prisma.brandConfigFile.findUnique({
            where: { id: result.id },
          });

          expect(dbRecord).not.toBeNull();
          expect(dbRecord?.brandId).toBe(brandId);
          expect(dbRecord?.fileName).toBe(fileName);
          expect(dbRecord?.fileSize).toBe(fileBuffer.length);
          expect(dbRecord?.userId).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: 上传返回完整元数据', () => {
  /**
   * Property: For any successfully uploaded file, the response should
   * contain id, fileName, fileSize, and createdAt fields with correct values.
   */
  it('should return complete metadata on successful upload', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validFileNameArb,
        fileContentArb,
        async (brandName, fileName, content) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId, brandName);
          const fileBuffer = Buffer.from(content);

          const result = await BrandConfigFileService.upload(userId, brandId, {
            originalname: fileName,
            size: fileBuffer.length,
            buffer: fileBuffer,
          });

          // Verify response contains all required fields
          expect(result.id).toBeDefined();
          expect(typeof result.id).toBe('string');
          expect(result.fileName).toBe(fileName);
          expect(result.fileSize).toBe(fileBuffer.length);
          expect(result.brandId).toBe(brandId);
          expect(result.createdAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: 文件列表完整性', () => {
  /**
   * Property: For any brand, querying the file list should return all
   * uploaded files with fileName, fileSize, and createdAt fields.
   */
  it('should return all uploaded files with complete metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        fc.array(fc.tuple(validFileNameArb, fileContentArb), { minLength: 1, maxLength: 5 }),
        async (brandName, filesData) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId, brandName);

          // Upload multiple files
          const uploadedFiles = [];
          for (const [fileName, content] of filesData) {
            const fileBuffer = Buffer.from(content);
            const result = await BrandConfigFileService.upload(userId, brandId, {
              originalname: fileName,
              size: fileBuffer.length,
              buffer: fileBuffer,
            });
            uploadedFiles.push(result);
          }

          // Query file list
          const fileList = await BrandConfigFileService.findByBrand(userId, brandId);

          // Verify all uploaded files are in the list
          expect(fileList.length).toBe(uploadedFiles.length);

          for (const uploaded of uploadedFiles) {
            const found = fileList.find((f) => f.id === uploaded.id);
            expect(found).toBeDefined();
            expect(found?.fileName).toBe(uploaded.fileName);
            expect(found?.fileSize).toBe(uploaded.fileSize);
            expect(found?.createdAt).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: 删除移除文件和记录', () => {
  /**
   * Property: For any uploaded file, deletion should remove both
   * the database record and the physical file.
   */
  it('should remove database record and physical file on delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBrandNameArb,
        validFileNameArb,
        fileContentArb,
        async (brandName, fileName, content) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId, brandName);
          const fileBuffer = Buffer.from(content);

          // Upload file
          const uploaded = await BrandConfigFileService.upload(userId, brandId, {
            originalname: fileName,
            size: fileBuffer.length,
            buffer: fileBuffer,
          });

          // Get storage path before deletion
          const dbRecord = await prisma.brandConfigFile.findUnique({
            where: { id: uploaded.id },
          });
          const storagePath = dbRecord?.storagePath;

          // Verify file exists before deletion
          expect(FileStorageService.fileExists(storagePath!)).toBe(true);

          // Delete file
          await BrandConfigFileService.delete(userId, uploaded.id);

          // Verify database record is removed
          const deletedRecord = await prisma.brandConfigFile.findUnique({
            where: { id: uploaded.id },
          });
          expect(deletedRecord).toBeNull();

          // Verify physical file is removed
          expect(FileStorageService.fileExists(storagePath!)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
