import { prisma } from '../db';
import { FileStorageService } from './fileStorage.service';
import { v4 as uuidv4 } from 'uuid';

export interface BrandConfigFileResponse {
  id: string;
  brandId: string;
  fileName: string;
  fileSize: number;
  createdAt: Date;
}

export interface UploadFileData {
  originalname: string;
  size: number;
  buffer: Buffer;
}

export class BrandConfigFileService {
  /**
   * 上传配置文件
   */
  static async upload(
    userId: string,
    brandId: string,
    file: UploadFileData
  ): Promise<BrandConfigFileResponse> {
    // 验证品牌存在且属于该用户
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    const fileId = uuidv4();
    const { originalname: fileName, size: fileSize, buffer } = file;

    // 保存文件到存储系统
    const storagePath = await FileStorageService.saveFile(
      userId,
      brandId,
      fileId,
      fileName,
      buffer
    );

    // 创建数据库记录
    const configFile = await prisma.brandConfigFile.create({
      data: {
        id: fileId,
        userId,
        brandId,
        fileName,
        fileSize,
        storagePath,
      },
    });

    return {
      id: configFile.id,
      brandId: configFile.brandId,
      fileName: configFile.fileName,
      fileSize: configFile.fileSize,
      createdAt: configFile.createdAt,
    };
  }

  /**
   * 获取品牌下所有配置文件
   */
  static async findByBrand(userId: string, brandId: string): Promise<BrandConfigFileResponse[]> {
    // 验证品牌存在且属于该用户
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    const files = await prisma.brandConfigFile.findMany({
      where: { brandId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      id: file.id,
      brandId: file.brandId,
      fileName: file.fileName,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
    }));
  }

  /**
   * 获取文件下载路径
   */
  static async getFilePath(
    userId: string,
    fileId: string
  ): Promise<{ path: string; fileName: string }> {
    const file = await prisma.brandConfigFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    const fullPath = FileStorageService.getFullPath(file.storagePath);

    if (!FileStorageService.fileExists(file.storagePath)) {
      throw new Error('File not found on disk');
    }

    return {
      path: fullPath,
      fileName: file.fileName,
    };
  }

  /**
   * 删除配置文件
   */
  static async delete(userId: string, fileId: string): Promise<void> {
    const file = await prisma.brandConfigFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // 删除物理文件
    await FileStorageService.deleteFile(file.storagePath);

    // 删除数据库记录
    await prisma.brandConfigFile.delete({
      where: { id: fileId },
    });
  }

  /**
   * 根据 ID 获取单个文件（用于权限验证）
   */
  static async findById(userId: string, fileId: string): Promise<BrandConfigFileResponse | null> {
    const file = await prisma.brandConfigFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      return null;
    }

    return {
      id: file.id,
      brandId: file.brandId,
      fileName: file.fileName,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
    };
  }
}

export default BrandConfigFileService;
