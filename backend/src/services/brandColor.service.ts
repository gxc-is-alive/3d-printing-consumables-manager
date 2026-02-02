import { prisma } from '../db';

export interface BrandColorResponse {
  id: string;
  userId: string;
  brandId: string;
  colorName: string;
  colorHex: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandColorData {
  colorName: string;
  colorHex?: string;
}

export interface UpdateBrandColorData {
  colorName?: string;
  colorHex?: string;
}

// 验证十六进制颜色格式
const isValidHexColor = (hex: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
};

export class BrandColorService {
  /**
   * 获取品牌下所有颜色（按颜色名称排序）
   */
  static async findAllByBrand(userId: string, brandId: string): Promise<BrandColorResponse[]> {
    // 验证品牌归属
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    return prisma.brandColor.findMany({
      where: { brandId, userId },
      orderBy: { colorName: 'asc' },
    });
  }

  /**
   * 创建品牌颜色
   */
  static async create(
    userId: string,
    brandId: string,
    data: CreateBrandColorData
  ): Promise<BrandColorResponse> {
    const { colorName, colorHex = '#CCCCCC' } = data;

    // 验证颜色名称不为空
    if (!colorName || colorName.trim() === '') {
      throw new Error('Color name is required');
    }

    // 验证颜色代码格式
    if (!isValidHexColor(colorHex)) {
      throw new Error('Invalid color hex format');
    }

    // 验证品牌归属
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    // 检查颜色名称是否已存在
    const existingColor = await prisma.brandColor.findUnique({
      where: { brandId_colorName: { brandId, colorName: colorName.trim() } },
    });

    if (existingColor) {
      throw new Error('Color name already exists');
    }

    return prisma.brandColor.create({
      data: {
        userId,
        brandId,
        colorName: colorName.trim(),
        colorHex,
      },
    });
  }

  /**
   * 更新品牌颜色
   */
  static async update(
    userId: string,
    brandId: string,
    colorId: string,
    data: UpdateBrandColorData
  ): Promise<BrandColorResponse> {
    // 验证颜色存在且属于该用户
    const existingColor = await prisma.brandColor.findFirst({
      where: { id: colorId, brandId, userId },
    });

    if (!existingColor) {
      throw new Error('Color not found');
    }

    // 验证颜色名称
    if (data.colorName !== undefined) {
      if (!data.colorName || data.colorName.trim() === '') {
        throw new Error('Color name is required');
      }

      // 检查新名称是否与其他颜色重复
      if (data.colorName.trim() !== existingColor.colorName) {
        const duplicateColor = await prisma.brandColor.findUnique({
          where: { brandId_colorName: { brandId, colorName: data.colorName.trim() } },
        });

        if (duplicateColor) {
          throw new Error('Color name already exists');
        }
      }
    }

    // 验证颜色代码格式
    if (data.colorHex !== undefined && !isValidHexColor(data.colorHex)) {
      throw new Error('Invalid color hex format');
    }

    return prisma.brandColor.update({
      where: { id: colorId },
      data: {
        colorName: data.colorName?.trim(),
        colorHex: data.colorHex,
      },
    });
  }

  /**
   * 删除品牌颜色
   */
  static async delete(userId: string, brandId: string, colorId: string): Promise<void> {
    // 验证颜色存在且属于该用户
    const color = await prisma.brandColor.findFirst({
      where: { id: colorId, brandId, userId },
    });

    if (!color) {
      throw new Error('Color not found');
    }

    await prisma.brandColor.delete({
      where: { id: colorId },
    });
  }

  /**
   * 根据颜色名称查找（用于去重检查）
   */
  static async findByName(
    userId: string,
    brandId: string,
    colorName: string
  ): Promise<BrandColorResponse | null> {
    // 验证品牌归属
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    return prisma.brandColor.findUnique({
      where: { brandId_colorName: { brandId, colorName: colorName.trim() } },
    });
  }

  /**
   * 批量创建颜色（用于迁移）
   */
  static async createMany(
    userId: string,
    brandId: string,
    colors: CreateBrandColorData[]
  ): Promise<number> {
    // 验证品牌归属
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    // 过滤有效的颜色数据
    const validColors = colors.filter((c) => c.colorName && c.colorName.trim() !== '');

    if (validColors.length === 0) {
      return 0;
    }

    // 获取已存在的颜色名称
    const existingColors = await prisma.brandColor.findMany({
      where: {
        brandId,
        colorName: { in: validColors.map((c) => c.colorName.trim()) },
      },
      select: { colorName: true },
    });

    const existingNames = new Set(existingColors.map((c) => c.colorName));

    // 过滤掉已存在的颜色
    const newColors = validColors.filter((c) => !existingNames.has(c.colorName.trim()));

    if (newColors.length === 0) {
      return 0;
    }

    const result = await prisma.brandColor.createMany({
      data: newColors.map((c) => ({
        userId,
        brandId,
        colorName: c.colorName.trim(),
        colorHex: c.colorHex && isValidHexColor(c.colorHex) ? c.colorHex : '#CCCCCC',
      })),
    });

    return result.count;
  }
}

export default BrandColorService;
