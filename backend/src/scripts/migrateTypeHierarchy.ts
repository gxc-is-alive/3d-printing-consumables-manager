/**
 * 耗材类型层级迁移脚本
 *
 * 将现有的单级分类数据转换为两级分类结构
 * 规则：
 * - "PETG Matte" -> 大类: PETG, 小类: Matte
 * - "PETG High Speed" -> 大类: PETG, 小类: High Speed
 * - "PLA" (单词且有子类) -> 保持为大类
 * - "PLA" (单词且无子类) -> 大类: 未分类, 小类: PLA
 *
 * 智能检测：
 * - 如果用户已有正确的两级结构（有子类的大类），则跳过迁移
 * - 只迁移名称包含空格的旧格式类型
 *
 * 使用方法：
 * - 预览模式: npx ts-node src/scripts/migrateTypeHierarchy.ts --preview
 * - 执行迁移: npx ts-node src/scripts/migrateTypeHierarchy.ts --execute
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ParsedTypeName {
  category: string;
  subtype: string;
}

interface MigrationLog {
  originalName: string;
  categoryName: string;
  subtypeName: string;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

/**
 * 检查用户是否已经有正确的两级分类结构
 * 判断标准：存在有子类的大类（parentId 为 null 且有 children）
 */
async function hasCorrectHierarchy(userId: string): Promise<boolean> {
  // 查找有子类的大类数量
  const categoriesWithChildren = await prisma.consumableType.findMany({
    where: {
      userId,
      parentId: null,
    },
    include: {
      children: true,
    },
  });

  // 如果存在有子类的大类，说明已经迁移过了
  const hasChildren = categoriesWithChildren.some((cat) => cat.children.length > 0);
  return hasChildren;
}

/**
 * 解析类型名称
 */
function parseTypeName(name: string): ParsedTypeName {
  if (!name || !name.trim()) {
    return { category: '未分类', subtype: '' };
  }

  const trimmedName = name.trim();
  const firstSpaceIndex = trimmedName.indexOf(' ');

  if (firstSpaceIndex === -1) {
    return { category: '未分类', subtype: trimmedName };
  }

  const category = trimmedName.substring(0, firstSpaceIndex).trim();
  const subtype = trimmedName.substring(firstSpaceIndex + 1).trim();

  if (!category || !subtype) {
    return { category: '未分类', subtype: trimmedName };
  }

  return { category, subtype };
}

/**
 * 预览迁移
 */
async function previewMigration() {
  console.log('\n========== 迁移预览 ==========\n');

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  for (const user of users) {
    console.log(`\n用户: ${user.email}`);
    console.log('-'.repeat(50));

    // 检查是否已经有正确的两级结构
    const alreadyMigrated = await hasCorrectHierarchy(user.id);
    if (alreadyMigrated) {
      console.log('  已有正确的两级分类结构，将跳过迁移');
      continue;
    }

    // 只查找名称包含空格的类型（这些才是需要迁移的旧格式）
    const typesWithSpace = await prisma.consumableType.findMany({
      where: {
        userId: user.id,
        parentId: null,
        name: { contains: ' ' },
      },
      include: {
        _count: {
          select: { consumables: true, brandTypes: true },
        },
      },
    });

    if (typesWithSpace.length === 0) {
      console.log('  无需迁移（没有旧格式的类型名称）');
      continue;
    }

    const categoriesSet = new Set<string>();
    const logs: Array<{
      original: string;
      category: string;
      subtype: string;
      consumables: number;
      brandTypes: number;
    }> = [];

    for (const type of typesWithSpace) {
      const parsed = parseTypeName(type.name);
      categoriesSet.add(parsed.category);
      logs.push({
        original: type.name,
        category: parsed.category,
        subtype: parsed.subtype,
        consumables: type._count.consumables,
        brandTypes: type._count.brandTypes,
      });
    }

    console.log(
      `\n  将创建/复用 ${categoriesSet.size} 个大类: ${Array.from(categoriesSet).join(', ')}`
    );
    console.log(`\n  类型映射:`);

    for (const log of logs) {
      console.log(
        `    "${log.original}" -> [${log.category}] ${log.subtype} (耗材: ${log.consumables}, 品牌配置: ${log.brandTypes})`
      );
    }
  }

  console.log('\n========== 预览结束 ==========\n');
}

/**
 * 执行迁移
 */
async function executeMigration() {
  console.log('\n========== 开始迁移 ==========\n');

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  let totalCategoriesCreated = 0;
  let totalSubtypesUpdated = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (const user of users) {
    console.log(`\n处理用户: ${user.email}`);
    console.log('-'.repeat(50));

    // 检查是否已经有正确的两级结构
    const alreadyMigrated = await hasCorrectHierarchy(user.id);
    if (alreadyMigrated) {
      console.log('  已有正确的两级分类结构，跳过迁移');
      totalSkipped++;
      continue;
    }

    const logs: MigrationLog[] = [];
    const categoryMap = new Map<string, string>(); // categoryName -> categoryId

    // 只获取名称包含空格的类型（这些才是需要迁移的旧格式）
    const typesWithSpace = await prisma.consumableType.findMany({
      where: {
        userId: user.id,
        parentId: null,
        name: { contains: ' ' },
      },
    });

    if (typesWithSpace.length === 0) {
      console.log('  无需迁移（没有旧格式的类型名称）');
      continue;
    }

    // 获取所有 parentId 为 null 的类型（用于查找可复用的大类）
    const allRootTypes = await prisma.consumableType.findMany({
      where: { userId: user.id, parentId: null },
    });

    // 解析需要迁移的类型
    const typesToMigrate: Array<{
      type: (typeof typesWithSpace)[0];
      parsed: ParsedTypeName;
    }> = [];

    // 收集所有需要的大类名称
    const neededCategories = new Set<string>();

    for (const type of typesWithSpace) {
      const parsed = parseTypeName(type.name);
      typesToMigrate.push({ type, parsed });
      neededCategories.add(parsed.category);
    }

    // 找出哪些现有类型可以直接作为大类使用（名称完全匹配且没有空格）
    for (const type of allRootTypes) {
      if (neededCategories.has(type.name) && !type.name.includes(' ')) {
        categoryMap.set(type.name, type.id);
        console.log(`  复用现有类型 "${type.name}" 作为大类`);
      }
    }

    // 创建缺失的大类
    for (const categoryName of neededCategories) {
      if (categoryMap.has(categoryName)) {
        continue; // 已经有了
      }

      try {
        const newCategory = await prisma.consumableType.create({
          data: {
            userId: user.id,
            name: categoryName,
            parentId: null,
          },
        });
        categoryMap.set(categoryName, newCategory.id);
        totalCategoriesCreated++;
        console.log(`  创建大类: ${categoryName}`);
      } catch (err) {
        console.error(`  创建大类 "${categoryName}" 失败:`, err);
        totalErrors++;
      }
    }

    // 更新需要迁移的类型为小类
    for (const { type, parsed } of typesToMigrate) {
      const categoryId = categoryMap.get(parsed.category);

      if (!categoryId) {
        logs.push({
          originalName: type.name,
          categoryName: parsed.category,
          subtypeName: parsed.subtype,
          status: 'error',
          error: `大类 "${parsed.category}" 不存在`,
        });
        totalErrors++;
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

        totalSubtypesUpdated++;
        logs.push({
          originalName: type.name,
          categoryName: parsed.category,
          subtypeName: parsed.subtype,
          status: 'success',
        });
        console.log(`  迁移: "${type.name}" -> [${parsed.category}] ${parsed.subtype}`);
      } catch (err) {
        logs.push({
          originalName: type.name,
          categoryName: parsed.category,
          subtypeName: parsed.subtype,
          status: 'error',
          error: String(err),
        });
        totalErrors++;
        console.error(`  迁移 "${type.name}" 失败:`, err);
      }
    }
  }

  console.log('\n========== 迁移完成 ==========');
  console.log(`跳过用户: ${totalSkipped} (已有正确结构)`);
  console.log(`创建大类: ${totalCategoriesCreated}`);
  console.log(`更新小类: ${totalSubtypesUpdated}`);
  console.log(`错误数量: ${totalErrors}`);
  console.log('================================\n');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--preview')) {
    await previewMigration();
  } else if (args.includes('--execute')) {
    await executeMigration();
  } else {
    console.log(`
耗材类型层级迁移脚本

使用方法:
  npx ts-node src/scripts/migrateTypeHierarchy.ts --preview   预览迁移结果
  npx ts-node src/scripts/migrateTypeHierarchy.ts --execute   执行迁移

迁移规则:
  - "PETG Matte" -> 大类: PETG, 小类: Matte
  - "PETG High Speed" -> 大类: PETG, 小类: High Speed
  - "PLA" -> 大类: 未分类, 小类: PLA
`);
  }
}

main()
  .catch((e) => {
    console.error('迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
