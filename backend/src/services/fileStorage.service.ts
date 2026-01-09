import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads', 'brand-configs');

export class FileStorageService {
  /**
   * 获取文件存储的基础目录
   */
  static getBaseDir(): string {
    return UPLOAD_BASE_DIR;
  }

  /**
   * 生成文件存储路径
   */
  static generateStoragePath(
    userId: string,
    brandId: string,
    fileId: string,
    fileName: string
  ): string {
    return path.join(userId, brandId, `${fileId}_${fileName}`);
  }

  /**
   * 获取文件的完整路径
   */
  static getFullPath(storagePath: string): string {
    return path.join(UPLOAD_BASE_DIR, storagePath);
  }

  /**
   * 确保目录存在，如果不存在则创建
   */
  static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 保存文件到指定路径
   */
  static async saveFile(
    userId: string,
    brandId: string,
    fileId: string,
    fileName: string,
    fileBuffer: Buffer
  ): Promise<string> {
    const storagePath = this.generateStoragePath(userId, brandId, fileId, fileName);
    const fullPath = this.getFullPath(storagePath);
    const dirPath = path.dirname(fullPath);

    // 确保目录存在
    this.ensureDirectoryExists(dirPath);

    // 写入文件
    await fs.promises.writeFile(fullPath, fileBuffer);

    return storagePath;
  }

  /**
   * 删除文件
   */
  static async deleteFile(storagePath: string): Promise<void> {
    const fullPath = this.getFullPath(storagePath);

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  /**
   * 读取文件内容
   */
  static async readFile(storagePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(storagePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    return fs.promises.readFile(fullPath);
  }

  /**
   * 检查文件是否存在
   */
  static fileExists(storagePath: string): boolean {
    const fullPath = this.getFullPath(storagePath);
    return fs.existsSync(fullPath);
  }

  /**
   * 删除用户的品牌目录（用于品牌删除时清理）
   */
  static async deleteBrandDirectory(userId: string, brandId: string): Promise<void> {
    const dirPath = path.join(UPLOAD_BASE_DIR, userId, brandId);

    if (fs.existsSync(dirPath)) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    }
  }
}

export default FileStorageService;
