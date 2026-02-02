/**
 * 品牌颜色迁移脚本
 * 从现有耗材数据中提取颜色并添加到品牌颜色库
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationResult {
  totalConsumables: number;
  uniqueColors: number;
  colorsCreated: number;
  errors: string[];
}

async function migrateBrandColors(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalConsumables: 0,
    uniqueColors: 0,
    colorsCreated: 0,
    errors: [],
  };

  try {
    console.log('开始品牌颜色迁移...');

    // 1. 获取所有耗材记录
    const consumables = await prisma.consumable.findMany({
      select: {
        id: true,
        userId: true,
        brandId: true,
        color: true,
        colorHex: true,
      },
    });

    result.totalConsumables = consumables.length;
    console.log(`找到 ${consumables.length} 条耗材记录`);

    // 2. 提取唯一的 (userId, brandId, colorName) 组合
    const uniqueColorsMap = new Map<
      string,
      { userId: string; brandId: string; colorName: string; colorHex: string }
    >();

    for (const consumable of consumables) {
      if (!consumable.color || consumable.color.trim() === '') {
        continue;
      }

      const key = `${consumable.userId}:${consumable.brandId}:${consumable.color.trim()}`;

      if (!uniqueColorsMap.has(key)) {
        // 处理多色情况：取第一个颜色
        let colorHex = '#CCCCCC';
        if (consumable.colorHex) {
          const colors = consumable.colorHex.split(',');
          colorHex = colors[0].trim() || '#CCCCCC';
        }

        uniqueColorsMap.set(key, {
          userId: consumable.userId,
          brandId: consumable.brandId,
          colorName: consumable.color.trim(),
          colorHex,
        });
      }
    }

    result.uniqueColors = uniqueColorsMap.size;
    console.log(`提取到 ${uniqueColorsMap.size} 个唯一颜色`);

    // 3. 获取已存在的品牌颜色
    const existingColors = await prisma.brandColor.findMany({
      select: {
        brandId: true,
        colorName: true,
      },
    });

    const existingColorKeys = new Set(existingColors.map((c) => `${c.brandId}:${c.colorName}`));

    console.log(`数据库中已有 ${existingColors.length} 条颜色记录`);

    // 4. 过滤出需要创建的颜色
    const colorsToCreate: Array<{
      userId: string;
      brandId: string;
      colorName: string;
      colorHex: string;
    }> = [];

    for (const [, colorData] of uniqueColorsMap) {
      const existKey = `${colorData.brandId}:${colorData.colorName}`;
      if (!existingColorKeys.has(existKey)) {
        colorsToCreate.push(colorData);
      }
    }

    console.log(`需要创建 ${colorsToCreate.length} 条新颜色记录`);

    // 5. 批量创建颜色记录
    if (colorsToCreate.length > 0) {
      const createResult = await prisma.brandColor.createMany({
        data: colorsToCreate.map((c) => ({
          userId: c.userId,
          brandId: c.brandId,
          colorName: c.colorName,
          colorHex: c.colorHex,
        })),
      });

      result.colorsCreated = createResult.count;
      console.log(`成功创建 ${createResult.count} 条颜色记录`);
    }

    console.log('迁移完成！');
    console.log(`总耗材数: ${result.totalConsumables}`);
    console.log(`唯一颜色数: ${result.uniqueColors}`);
    console.log(`新创建颜色数: ${result.colorsCreated}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);
    console.error('迁移失败:', errorMessage);
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateBrandColors()
    .then((result) => {
      console.log('\n迁移结果:', JSON.stringify(result, null, 2));
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export { migrateBrandColors };
