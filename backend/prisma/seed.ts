import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 预设配件分类
const presetCategories = [
  {
    name: '打印板',
    description: '热床板、PEI板、玻璃板等',
    isPreset: true,
  },
  {
    name: '润滑剂',
    description: '润滑油、润滑脂等',
    isPreset: true,
  },
  {
    name: '喷嘴',
    description: '各种规格的打印喷嘴',
    isPreset: true,
  },
  {
    name: '传动部件',
    description: '皮带、轴承、丝杆等',
    isPreset: true,
  },
  {
    name: '电子元件',
    description: '加热棒、热敏电阻、风扇等',
    isPreset: true,
  },
  {
    name: '其他',
    description: '其他配件',
    isPreset: true,
  },
];

async function main() {
  console.log('开始创建预设配件分类...');

  for (const category of presetCategories) {
    const existing = await prisma.accessoryCategory.findFirst({
      where: {
        name: category.name,
        isPreset: true,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.accessoryCategory.create({
        data: {
          name: category.name,
          description: category.description,
          isPreset: true,
          userId: null,
        },
      });
      console.log(`创建分类: ${category.name}`);
    } else {
      console.log(`分类已存在: ${category.name}`);
    }
  }

  console.log('预设配件分类创建完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
