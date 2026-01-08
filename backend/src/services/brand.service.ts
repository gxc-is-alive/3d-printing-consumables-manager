import { prisma } from '../db';

export interface BrandResponse {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandData {
  name: string;
  description?: string;
  website?: string;
}

export interface UpdateBrandData {
  name?: string;
  description?: string;
  website?: string;
}

export class BrandService {
  /**
   * Create a new brand for a user
   */
  static async create(userId: string, data: CreateBrandData): Promise<BrandResponse> {
    const { name, description, website } = data;

    // Check if brand name already exists for this user
    const existingBrand = await prisma.brand.findUnique({
      where: { userId_name: { userId, name } },
    });

    if (existingBrand) {
      throw new Error('Brand name already exists');
    }

    return prisma.brand.create({
      data: {
        userId,
        name,
        description,
        website,
      },
    });
  }

  /**
   * Get all brands for a user
   */
  static async findAllByUser(userId: string): Promise<BrandResponse[]> {
    return prisma.brand.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a single brand by ID (with user ownership check)
   */
  static async findById(userId: string, brandId: string): Promise<BrandResponse> {
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    return brand;
  }

  /**
   * Update a brand
   */
  static async update(
    userId: string,
    brandId: string,
    data: UpdateBrandData
  ): Promise<BrandResponse> {
    // Check if brand exists and belongs to user
    const existingBrand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!existingBrand) {
      throw new Error('Brand not found');
    }

    // If name is being changed, check for duplicates
    if (data.name && data.name !== existingBrand.name) {
      const duplicateBrand = await prisma.brand.findUnique({
        where: { userId_name: { userId, name: data.name } },
      });

      if (duplicateBrand) {
        throw new Error('Brand name already exists');
      }
    }

    return prisma.brand.update({
      where: { id: brandId },
      data: {
        name: data.name,
        description: data.description,
        website: data.website,
      },
    });
  }

  /**
   * Delete a brand (with referential integrity check)
   */
  static async delete(userId: string, brandId: string): Promise<void> {
    // Check if brand exists and belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    // Check if brand has associated consumables
    const consumableCount = await prisma.consumable.count({
      where: { brandId },
    });

    if (consumableCount > 0) {
      throw new Error('Cannot delete brand with existing consumables');
    }

    await prisma.brand.delete({
      where: { id: brandId },
    });
  }
}

export default BrandService;
