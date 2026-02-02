import { prisma } from '../db';

// ============ 类型定义 ============

export interface ConsumableTypeResponse {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypeSubtype {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TypeCategory {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  parentId: null;
  children: TypeSubtype[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TypeHierarchyResponse {
  categories: TypeCategory[];
}

export interface CreateConsumableTypeData {
  name: string;
  description?: string;
}

export interface UpdateConsumableTypeData {
  name?: string;
  description?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export interface CreateSubtypeData {
  name: string;
  description?: string;
  parentId: string;
}

export interface UpdateSubtypeData {
  name?: string;
  description?: string;
}

// ============ 服务类 ============

export class ConsumableTypeService {
  // ============ 大类操作 ============

  /**
   * 创建大类
   */
  static async createCategory(userId: string, data: CreateCategoryData): Promise<TypeCategory> {
    const { name, description } = data;

    // 验证名称不为空
    if (!name || !name.trim()) {
      throw new Error('Category name is required');
    }

    const trimmedName = name.trim();

    // 检查同一用户下大类名称是否重复
    const existingCategory = await prisma.consumableType.findFirst({
      where: { userId, name: trimmedName, parentId: null },
    });

    if (existingCategory) {
      throw new Error('Category name already exists');
    }

    const category = await prisma.consumableType.create({
      data: {
        userId,
        name: trimmedName,
        description,
        parentId: null,
      },
    });

    return {
      ...category,
      parentId: null,
      children: [],
    } as TypeCategory;
  }

  /**
   * 更新大类
   */
  static async updateCategory(
    userId: string,
    id: string,
    data: UpdateCategoryData
  ): Promise<TypeCategory> {
    // 检查大类是否存在
    const existingCategory = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: null },
    });

    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // 如果更新名称，检查重复
    if (data.name && data.name.trim() !== existingCategory.name) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new Error('Category name is required');
      }

      const duplicateCategory = await prisma.consumableType.findFirst({
        where: { userId, name: trimmedName, parentId: null, id: { not: id } },
      });

      if (duplicateCategory) {
        throw new Error('Category name already exists');
      }
    }

    const updated = await prisma.consumableType.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description,
      },
      include: {
        children: true,
      },
    });

    return {
      ...updated,
      parentId: null,
      children: updated.children as TypeSubtype[],
    } as TypeCategory;
  }

  /**
   * 删除大类（检查是否有子类）
   */
  static async deleteCategory(userId: string, id: string): Promise<void> {
    // 检查大类是否存在
    const category = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: null },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // 检查是否有子类
    const childCount = await prisma.consumableType.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new Error('Cannot delete category with subtypes');
    }

    await prisma.consumableType.delete({
      where: { id },
    });
  }

  // ============ 小类操作 ============

  /**
   * 创建小类
   */
  static async createSubtype(userId: string, data: CreateSubtypeData): Promise<TypeSubtype> {
    const { name, description, parentId } = data;

    // 验证名称不为空
    if (!name || !name.trim()) {
      throw new Error('Subtype name is required');
    }

    const trimmedName = name.trim();

    // 检查父类是否存在
    const parentCategory = await prisma.consumableType.findFirst({
      where: { id: parentId, userId, parentId: null },
    });

    if (!parentCategory) {
      throw new Error('Target category not found');
    }

    // 检查同一大类下小类名称是否重复
    const existingSubtype = await prisma.consumableType.findFirst({
      where: { userId, name: trimmedName, parentId },
    });

    if (existingSubtype) {
      throw new Error('Subtype name already exists in this category');
    }

    const subtype = await prisma.consumableType.create({
      data: {
        userId,
        name: trimmedName,
        description,
        parentId,
      },
    });

    return subtype as TypeSubtype;
  }

  /**
   * 更新小类
   */
  static async updateSubtype(
    userId: string,
    id: string,
    data: UpdateSubtypeData
  ): Promise<TypeSubtype> {
    // 检查小类是否存在
    const existingSubtype = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: { not: null } },
    });

    if (!existingSubtype) {
      throw new Error('Subtype not found');
    }

    // 如果更新名称，检查重复
    if (data.name && data.name.trim() !== existingSubtype.name) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new Error('Subtype name is required');
      }

      const duplicateSubtype = await prisma.consumableType.findFirst({
        where: {
          userId,
          name: trimmedName,
          parentId: existingSubtype.parentId,
          id: { not: id },
        },
      });

      if (duplicateSubtype) {
        throw new Error('Subtype name already exists in this category');
      }
    }

    const updated = await prisma.consumableType.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description,
      },
    });

    return updated as TypeSubtype;
  }

  /**
   * 移动小类到另一个大类
   */
  static async moveSubtype(userId: string, id: string, newParentId: string): Promise<TypeSubtype> {
    // 检查小类是否存在
    const existingSubtype = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: { not: null } },
    });

    if (!existingSubtype) {
      throw new Error('Subtype not found');
    }

    // 检查目标大类是否存在
    const targetCategory = await prisma.consumableType.findFirst({
      where: { id: newParentId, userId, parentId: null },
    });

    if (!targetCategory) {
      throw new Error('Target category not found');
    }

    // 检查目标大类下是否有同名小类
    const duplicateSubtype = await prisma.consumableType.findFirst({
      where: {
        userId,
        name: existingSubtype.name,
        parentId: newParentId,
        id: { not: id },
      },
    });

    if (duplicateSubtype) {
      throw new Error('Subtype name already exists in target category');
    }

    const updated = await prisma.consumableType.update({
      where: { id },
      data: { parentId: newParentId },
    });

    return updated as TypeSubtype;
  }

  /**
   * 删除小类（检查是否有引用）
   */
  static async deleteSubtype(userId: string, id: string): Promise<void> {
    // 检查小类是否存在
    const subtype = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: { not: null } },
    });

    if (!subtype) {
      throw new Error('Subtype not found');
    }

    // 检查是否有关联的耗材
    const consumableCount = await prisma.consumable.count({
      where: { typeId: id },
    });

    if (consumableCount > 0) {
      throw new Error('Cannot delete subtype with existing consumables');
    }

    // 检查是否有关联的品牌类型配置
    const brandTypeCount = await prisma.brandType.count({
      where: { typeId: id },
    });

    if (brandTypeCount > 0) {
      throw new Error('Cannot delete subtype with existing brand type configurations');
    }

    await prisma.consumableType.delete({
      where: { id },
    });
  }

  // ============ 查询操作 ============

  /**
   * 获取层级结构
   */
  static async findAllHierarchy(userId: string): Promise<TypeHierarchyResponse> {
    // 获取所有大类及其子类
    const categories = await prisma.consumableType.findMany({
      where: { userId, parentId: null },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      categories: categories.map((cat) => ({
        ...cat,
        parentId: null,
        children: cat.children as TypeSubtype[],
      })) as TypeCategory[],
    };
  }

  /**
   * 根据 ID 获取大类
   */
  static async findCategoryById(userId: string, id: string): Promise<TypeCategory> {
    const category = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: null },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return {
      ...category,
      parentId: null,
      children: category.children as TypeSubtype[],
    } as TypeCategory;
  }

  /**
   * 根据 ID 获取小类
   */
  static async findSubtypeById(userId: string, id: string): Promise<TypeSubtype> {
    const subtype = await prisma.consumableType.findFirst({
      where: { id, userId, parentId: { not: null } },
    });

    if (!subtype) {
      throw new Error('Subtype not found');
    }

    return subtype as TypeSubtype;
  }

  /**
   * 根据 ID 获取类型（包含父类信息）
   */
  static async findTypeWithParent(
    userId: string,
    id: string
  ): Promise<ConsumableTypeResponse & { parent?: ConsumableTypeResponse }> {
    const type = await prisma.consumableType.findFirst({
      where: { id, userId },
      include: {
        parent: true,
      },
    });

    if (!type) {
      throw new Error('Consumable type not found');
    }

    return {
      ...type,
      parent: type.parent || undefined,
    };
  }

  // ============ 兼容旧 API ============

  /**
   * Create a new consumable type for a user (兼容旧 API)
   */
  static async create(
    userId: string,
    data: CreateConsumableTypeData
  ): Promise<ConsumableTypeResponse> {
    const { name, description } = data;

    // Check if type name already exists for this user
    const existingType = await prisma.consumableType.findFirst({
      where: { userId, name, parentId: null },
    });

    if (existingType) {
      throw new Error('Consumable type name already exists');
    }

    return prisma.consumableType.create({
      data: {
        userId,
        name,
        description,
        parentId: null,
      },
    });
  }

  /**
   * Get all consumable types for a user (兼容旧 API，返回扁平列表)
   */
  static async findAllByUser(userId: string): Promise<ConsumableTypeResponse[]> {
    return prisma.consumableType.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single consumable type by ID (with user ownership check)
   */
  static async findById(userId: string, typeId: string): Promise<ConsumableTypeResponse> {
    const consumableType = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });

    if (!consumableType) {
      throw new Error('Consumable type not found');
    }

    return consumableType;
  }

  /**
   * Update a consumable type (兼容旧 API)
   */
  static async update(
    userId: string,
    typeId: string,
    data: UpdateConsumableTypeData
  ): Promise<ConsumableTypeResponse> {
    const existingType = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });

    if (!existingType) {
      throw new Error('Consumable type not found');
    }

    // If name is being changed, check for duplicates in same parent
    if (data.name && data.name !== existingType.name) {
      const duplicateType = await prisma.consumableType.findFirst({
        where: {
          userId,
          name: data.name,
          parentId: existingType.parentId,
          id: { not: typeId },
        },
      });

      if (duplicateType) {
        throw new Error('Consumable type name already exists');
      }
    }

    return prisma.consumableType.update({
      where: { id: typeId },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Delete a consumable type (with referential integrity check)
   */
  static async delete(userId: string, typeId: string): Promise<void> {
    const consumableType = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });

    if (!consumableType) {
      throw new Error('Consumable type not found');
    }

    // 如果是大类，检查是否有子类
    if (consumableType.parentId === null) {
      const childCount = await prisma.consumableType.count({
        where: { parentId: typeId },
      });

      if (childCount > 0) {
        throw new Error('Cannot delete category with subtypes');
      }
    }

    // 检查是否有关联的耗材
    const consumableCount = await prisma.consumable.count({
      where: { typeId },
    });

    if (consumableCount > 0) {
      throw new Error('Cannot delete type with existing consumables');
    }

    await prisma.consumableType.delete({
      where: { id: typeId },
    });
  }
}

export default ConsumableTypeService;
