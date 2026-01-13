import { prisma } from '../db';

export interface BrandTypeResponse {
  id: string;
  userId: string;
  brandId: string;
  typeId: string;
  printTempMin: number | null;
  printTempMax: number | null;
  bedTempMin: number | null;
  bedTempMax: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  type?: {
    id: string;
    name: string;
    description: string | null;
  };
  brand?: {
    id: string;
    name: string;
  };
}

export interface CreateBrandTypeData {
  brandId: string;
  typeId: string;
  printTempMin?: number;
  printTempMax?: number;
  bedTempMin?: number;
  bedTempMax?: number;
  notes?: string;
}

export interface UpdateBrandTypeData {
  printTempMin?: number | null;
  printTempMax?: number | null;
  bedTempMin?: number | null;
  bedTempMax?: number | null;
  notes?: string | null;
}

export class BrandTypeService {
  /**
   * 创建品牌类型配置
   */
  static async create(userId: string, data: CreateBrandTypeData): Promise<BrandTypeResponse> {
    // 验证品牌属于该用户
    const brand = await prisma.brand.findFirst({
      where: { id: data.brandId, userId },
    });
    if (!brand) {
      throw new Error('Brand not found');
    }

    // 验证类型属于该用户
    const type = await prisma.consumableType.findFirst({
      where: { id: data.typeId, userId },
    });
    if (!type) {
      throw new Error('Consumable type not found');
    }

    // 检查是否已存在
    const existing = await prisma.brandType.findUnique({
      where: { brandId_typeId: { brandId: data.brandId, typeId: data.typeId } },
    });
    if (existing) {
      throw new Error('Brand type configuration already exists');
    }

    return prisma.brandType.create({
      data: {
        userId,
        brandId: data.brandId,
        typeId: data.typeId,
        printTempMin: data.printTempMin,
        printTempMax: data.printTempMax,
        bedTempMin: data.bedTempMin,
        bedTempMax: data.bedTempMax,
        notes: data.notes,
      },
      include: {
        type: { select: { id: true, name: true, description: true } },
        brand: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 批量创建或更新品牌类型配置
   */
  static async upsertMany(
    userId: string,
    brandId: string,
    configs: Array<{
      typeId: string;
      printTempMin?: number | null;
      printTempMax?: number | null;
      bedTempMin?: number | null;
      bedTempMax?: number | null;
      notes?: string | null;
    }>
  ): Promise<BrandTypeResponse[]> {
    // 验证品牌属于该用户
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });
    if (!brand) {
      throw new Error('Brand not found');
    }

    const results: BrandTypeResponse[] = [];

    for (const config of configs) {
      // 验证类型属于该用户
      const type = await prisma.consumableType.findFirst({
        where: { id: config.typeId, userId },
      });
      if (!type) {
        continue; // 跳过无效的类型
      }

      const result = await prisma.brandType.upsert({
        where: { brandId_typeId: { brandId, typeId: config.typeId } },
        create: {
          userId,
          brandId,
          typeId: config.typeId,
          printTempMin: config.printTempMin,
          printTempMax: config.printTempMax,
          bedTempMin: config.bedTempMin,
          bedTempMax: config.bedTempMax,
          notes: config.notes,
        },
        update: {
          printTempMin: config.printTempMin,
          printTempMax: config.printTempMax,
          bedTempMin: config.bedTempMin,
          bedTempMax: config.bedTempMax,
          notes: config.notes,
        },
        include: {
          type: { select: { id: true, name: true, description: true } },
          brand: { select: { id: true, name: true } },
        },
      });
      results.push(result);
    }

    return results;
  }

  /**
   * 获取品牌的所有类型配置
   */
  static async findByBrand(userId: string, brandId: string): Promise<BrandTypeResponse[]> {
    return prisma.brandType.findMany({
      where: { userId, brandId },
      include: {
        type: { select: { id: true, name: true, description: true } },
      },
      orderBy: { type: { name: 'asc' } },
    });
  }

  /**
   * 获取特定品牌特定类型的配置
   */
  static async findByBrandAndType(
    userId: string,
    brandId: string,
    typeId: string
  ): Promise<BrandTypeResponse | null> {
    return prisma.brandType.findFirst({
      where: { userId, brandId, typeId },
      include: {
        type: { select: { id: true, name: true, description: true } },
        brand: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 更新品牌类型配置
   */
  static async update(
    userId: string,
    id: string,
    data: UpdateBrandTypeData
  ): Promise<BrandTypeResponse> {
    const existing = await prisma.brandType.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Brand type configuration not found');
    }

    return prisma.brandType.update({
      where: { id },
      data: {
        printTempMin: data.printTempMin,
        printTempMax: data.printTempMax,
        bedTempMin: data.bedTempMin,
        bedTempMax: data.bedTempMax,
        notes: data.notes,
      },
      include: {
        type: { select: { id: true, name: true, description: true } },
        brand: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 删除品牌类型配置
   */
  static async delete(userId: string, id: string): Promise<void> {
    const existing = await prisma.brandType.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Brand type configuration not found');
    }

    await prisma.brandType.delete({ where: { id } });
  }

  /**
   * 删除品牌的所有类型配置
   */
  static async deleteByBrand(userId: string, brandId: string): Promise<void> {
    await prisma.brandType.deleteMany({
      where: { userId, brandId },
    });
  }
}

export default BrandTypeService;
