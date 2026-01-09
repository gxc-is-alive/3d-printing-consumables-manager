/**
 * Property-Based Tests for File Storage Service
 * Feature: brand-config-files, Property 5: 文件下载 Round-Trip
 * Validates: Requirements 3.1
 *
 * Property: For any uploaded file, downloading it should return content
 * identical to the original upload content.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { FileStorageService } from '../services/fileStorage.service';
import { v4 as uuidv4 } from 'uuid';

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
    fc.constantFrom('.txt', '.json', '.xml', '.ini', '.cfg', '.bin')
  )
  .map(([name, ext]) => `${name}${ext}`);

// Arbitrary for generating file content (binary data)
const fileContentArb = fc.uint8Array({ minLength: 1, maxLength: 10000 });

// Arbitrary for generating UUIDs
const uuidArb = fc.constant(null).map(() => uuidv4());

describe('Property 5: 文件下载 Round-Trip', () => {
  /**
   * Property: For any file content, saving and then reading should return
   * identical content (round-trip property).
   */
  it('should preserve file content through save-read cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        validFileNameArb,
        fileContentArb,
        async (userId, brandId, fileId, fileName, content) => {
          const fileBuffer = Buffer.from(content);

          // Save file
          const storagePath = await FileStorageService.saveFile(
            userId,
            brandId,
            fileId,
            fileName,
            fileBuffer
          );

          // Verify storage path is generated correctly
          expect(storagePath).toContain(userId);
          expect(storagePath).toContain(brandId);
          expect(storagePath).toContain(fileId);
          expect(storagePath).toContain(fileName);

          // Read file back
          const readBuffer = await FileStorageService.readFile(storagePath);

          // Verify content is identical (round-trip property)
          expect(readBuffer.equals(fileBuffer)).toBe(true);

          // Clean up
          await FileStorageService.deleteFile(storagePath);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: File existence check should correctly reflect file state.
   */
  it('should correctly report file existence', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        validFileNameArb,
        fileContentArb,
        async (userId, brandId, fileId, fileName, content) => {
          const fileBuffer = Buffer.from(content);

          // Generate storage path
          const storagePath = FileStorageService.generateStoragePath(
            userId,
            brandId,
            fileId,
            fileName
          );

          // File should not exist initially
          expect(FileStorageService.fileExists(storagePath)).toBe(false);

          // Save file
          await FileStorageService.saveFile(userId, brandId, fileId, fileName, fileBuffer);

          // File should exist after save
          expect(FileStorageService.fileExists(storagePath)).toBe(true);

          // Delete file
          await FileStorageService.deleteFile(storagePath);

          // File should not exist after delete
          expect(FileStorageService.fileExists(storagePath)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Deleting a non-existent file should not throw an error.
   */
  it('should handle deletion of non-existent files gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        uuidArb,
        validFileNameArb,
        async (userId, brandId, fileId, fileName) => {
          const storagePath = FileStorageService.generateStoragePath(
            userId,
            brandId,
            fileId,
            fileName
          );

          // Deleting non-existent file should not throw
          await expect(FileStorageService.deleteFile(storagePath)).resolves.not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
