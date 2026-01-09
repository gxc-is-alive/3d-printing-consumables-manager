import { prisma } from '../db';

export interface AccessoryCategoryResponse {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  isPreset: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export class AccessoryCategoryService {
  /**
   * 获取所有预设分类
   */
  static async getPresetCategories(): Promise<AccessoryCategoryResponse[]> {
    return prisma.accessoryCategory.findMany({
      where: { isPreset: true, userId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 获取用户的所有分类（预设 + 自定义）
   */
  static async findAllByUser(userId: string): Promise<AccessoryCategoryResponse[]> {
    const [presetCategories, userCategories] = await Promise.all([
      prisma.accessoryCategory.findMany({
        where: { isPreset: true, userId: null },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.accessoryCategory.findMany({
        where: { userId, isPreset: false },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return [...presetCategories, ...userCategories];
  }

  /**
   * 创建自定义分类
   */
  static async create(
    userId: string,
    data: CreateCategoryData
  ): Promise<AccessoryCategoryResponse> {
    const { name, description } = data;

    // 检查名称是否与预设分类重复
    const existingPreset = await prisma.accessoryCategory.findFirst({
      where: { name, isPreset: true, userId: null },
    });

    if (existingPreset) {
      throw new Error('Category name conflicts with preset category');
    }

    // 检查名称是否与用户自定义分类重复
    const existingUser = await prisma.accessoryCategory.findFirst({
      where: { name, userId },
    });

    if (existingUser) {
      throw new Error('Category already exists');
    }

    return prisma.accessoryCategory.create({
      data: {
        userId,
        name,
        description,
        isPreset: false,
      },
    });
  }

  /**
   * 删除自定义分类
   */
  static async delete(userId: string, id: string): Promise<void> {
    // 检查分类是否存在
    const category = await prisma.accessoryCategory.findFirst({
      where: { id },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // 不能删除预设分类
    if (category.isPreset) {
      throw new Error('Cannot delete preset category');
    }

    // 检查是否属于该用户
    if (category.userId !== userId) {
      throw new Error('Access denied');
    }

    // 检查是否有配件使用该分类
    const accessoryCount = await prisma.accessory.count({
      where: { categoryId: id },
    });

    if (accessoryCount > 0) {
      throw new Error('Category has accessories');
    }

    await prisma.accessoryCategory.delete({
      where: { id },
    });
  }

  /**
   * 根据 ID 获取分类
   */
  static async findById(id: string): Promise<AccessoryCategoryResponse> {
    const category = await prisma.accessoryCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }
}

export default AccessoryCategoryService;
