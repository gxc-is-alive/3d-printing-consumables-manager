import { prisma } from '../db';

// ============ 类型定义 ============

export interface ParsedTypeName {
  category: string;
  subtype: string;
}

export interface MigrationLog {
  originalName: string;
  categoryName: string;
  subtypeName: string;
  status: 'success' | 'error';
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  categoriesCreated: number;
  subtypesUpdated: number;
  recordsMigrated: number;
  errors: string[];
  logs: MigrationLog[];
}

export interface MigrationPreview {
  types: Array<{
    id: string;
    originalName: string;
    categoryName: string;
    subtypeName: string;
    hasConsumables: boolean;
    hasBrandTypes: boolean;
  }>;
  categoriesWillCreate: string[];
  totalTypes: number;
}

// ============ 迁移服务 ============

export class TypeMigrationService {
  /**
   * 解析类型名称，按第一个空格拆分为大类和小类
   * - "PETG Matte" -> { category: "PETG", subtype: "Matte" }
   * - "PETG High Speed" -> { category: "PETG", subtype: "High Speed" }
   * - "PLA" -> { category: "未分类", subtype: "PLA" }
   */
  static parseTypeName(name: string): ParsedTypeName {
    if (!name || !name.trim()) {
      return { category: '未分类', subtype: '' };
    }

    const trimmedName = name.trim();
    const firstSpaceIndex = trimmedName.indexOf(' ');

    if (firstSpaceIndex === -1) {
      // 没有空格，整个名称作为小类
      return { category: '未分类', subtype: trimmedName };
    }

    const category = trimmedName.substring(0, firstSpaceIndex).trim();
    const subtype = trimmedName.substring(firstSpaceIndex + 1).trim();

    // 如果拆分后大类或小类为空，则归入未分类
    if (!category || !subtype) {
      return { category: '未分类', subtype: trimmedName };
    }

    return { category, subtype };
  }

  /**
   * 预览迁移结果
   */
  static async previewMigration(userId: string): Promise<MigrationPreview> {
    // 获取所有没有 parentId 的类型（即还未迁移的旧数据）
    const types = await prisma.consumableType.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            consumables: true,
            brandTypes: true,
          },
        },
      },
    });

    const categoriesSet = new Set<string>();
    const previewTypes = types.map((type) => {
      const parsed = this.parseTypeName(type.name);
      categoriesSet.add(parsed.category);
      return {
        id: type.id,
        originalName: type.name,
        categoryName: parsed.category,
        subtypeName: parsed.subtype,
        hasConsumables: type._count.consumables > 0,
        hasBrandTypes: type._count.brandTypes > 0,
      };
    });

    return {
      types: previewTypes,
      categoriesWillCreate: Array.from(categoriesSet).sort(),
      totalTypes: types.length,
    };
  }

  /**
   * 执行数据迁移
   * 将现有的单级分类数据转换为两级分类结构
   */
  static async migrateToHierarchy(userId: string): Promise<MigrationResult> {
    const logs: MigrationLog[] = [];
    const errors: string[] = [];
    let categoriesCreated = 0;
    let subtypesUpdated = 0;
    let recordsMigrated = 0;

    try {
      // 1. 获取所有还未迁移的类型（parentId 为 null 的记录）
      const existingTypes = await prisma.consumableType.findMany({
        where: { userId, parentId: null },
      });

      if (existingTypes.length === 0) {
        return {
          success: true,
          categoriesCreated: 0,
          subtypesUpdated: 0,
          recordsMigrated: 0,
          errors: [],
          logs: [],
        };
      }

      // 2. 解析所有类型名称，收集需要的大类
      const categoryMap = new Map<string, string>(); // categoryName -> categoryId
      const neededCategories = new Set<string>();
      const typesToMigrate: Array<{
        type: (typeof existingTypes)[0];
        parsed: ParsedTypeName;
      }> = [];

      for (const type of existingTypes) {
        const parsed = this.parseTypeName(type.name);
        typesToMigrate.push({ type, parsed });
        neededCategories.add(parsed.category);
      }

      // 3. 找出哪些现有类型可以直接作为大类使用
      const typesAsCategories = new Set<string>(); // 类型ID集合
      for (const { type, parsed } of typesToMigrate) {
        // 如果类型名称正好是某个需要的大类名称，且该类型名称不包含空格
        if (neededCategories.has(type.name) && !type.name.includes(' ')) {
          typesAsCategories.add(type.id);
          categoryMap.set(type.name, type.id);
        }
      }

      // 4. 创建缺失的大类
      for (const categoryName of neededCategories) {
        if (categoryMap.has(categoryName)) {
          continue; // 已经有了
        }

        try {
          const newCategory = await prisma.consumableType.create({
            data: {
              userId,
              name: categoryName,
              parentId: null,
            },
          });
          categoryMap.set(categoryName, newCategory.id);
          categoriesCreated++;
        } catch (err) {
          const errorMsg = `Failed to create category "${categoryName}": ${err}`;
          errors.push(errorMsg);
        }
      }

      // 5. 更新现有类型为小类（跳过被用作大类的类型）
      for (const { type, parsed } of typesToMigrate) {
        // 如果这个类型被用作大类，跳过
        if (typesAsCategories.has(type.id)) {
          continue;
        }

        const categoryId = categoryMap.get(parsed.category);

        if (!categoryId) {
          const log: MigrationLog = {
            originalName: type.name,
            categoryName: parsed.category,
            subtypeName: parsed.subtype,
            status: 'error',
            error: `Category "${parsed.category}" not found`,
          };
          logs.push(log);
          errors.push(`Failed to migrate "${type.name}": category not found`);
          continue;
        }

        try {
          await prisma.consumableType.update({
            where: { id: type.id },
            data: {
              name: parsed.subtype || type.name,
              parentId: categoryId,
            },
          });

          subtypesUpdated++;
          recordsMigrated++;

          logs.push({
            originalName: type.name,
            categoryName: parsed.category,
            subtypeName: parsed.subtype,
            status: 'success',
          });
        } catch (err) {
          const log: MigrationLog = {
            originalName: type.name,
            categoryName: parsed.category,
            subtypeName: parsed.subtype,
            status: 'error',
            error: String(err),
          };
          logs.push(log);
          errors.push(`Failed to migrate "${type.name}": ${err}`);
        }
      }

      return {
        success: errors.length === 0,
        categoriesCreated,
        subtypesUpdated,
        recordsMigrated,
        errors,
        logs,
      };
    } catch (err) {
      return {
        success: false,
        categoriesCreated,
        subtypesUpdated,
        recordsMigrated,
        errors: [`Migration failed: ${err}`],
        logs,
      };
    }
  }

  /**
   * 检查是否需要迁移
   */
  static async needsMigration(userId: string): Promise<boolean> {
    // 检查是否有 parentId 为 null 且名称包含空格的类型
    const typesWithSpace = await prisma.consumableType.findMany({
      where: {
        userId,
        parentId: null,
        name: { contains: ' ' },
      },
    });

    return typesWithSpace.length > 0;
  }
}

export default TypeMigrationService;
