import { prisma } from '../db';

export interface ConsumableTypeResponse {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  printTempMin: number | null;
  printTempMax: number | null;
  bedTempMin: number | null;
  bedTempMax: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConsumableTypeData {
  name: string;
  description?: string;
  printTempMin?: number;
  printTempMax?: number;
  bedTempMin?: number;
  bedTempMax?: number;
}

export interface UpdateConsumableTypeData {
  name?: string;
  description?: string;
  printTempMin?: number;
  printTempMax?: number;
  bedTempMin?: number;
  bedTempMax?: number;
}

export class ConsumableTypeService {
  /**
   * Create a new consumable type for a user
   */
  static async create(
    userId: string,
    data: CreateConsumableTypeData
  ): Promise<ConsumableTypeResponse> {
    const { name, description, printTempMin, printTempMax, bedTempMin, bedTempMax } = data;

    // Check if type name already exists for this user
    const existingType = await prisma.consumableType.findUnique({
      where: { userId_name: { userId, name } },
    });

    if (existingType) {
      throw new Error('Consumable type name already exists');
    }

    return prisma.consumableType.create({
      data: {
        userId,
        name,
        description,
        printTempMin,
        printTempMax,
        bedTempMin,
        bedTempMax,
      },
    });
  }

  /**
   * Get all consumable types for a user
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
   * Update a consumable type
   */
  static async update(
    userId: string,
    typeId: string,
    data: UpdateConsumableTypeData
  ): Promise<ConsumableTypeResponse> {
    // Check if type exists and belongs to user
    const existingType = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });

    if (!existingType) {
      throw new Error('Consumable type not found');
    }

    // If name is being changed, check for duplicates
    if (data.name && data.name !== existingType.name) {
      const duplicateType = await prisma.consumableType.findUnique({
        where: { userId_name: { userId, name: data.name } },
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
        printTempMin: data.printTempMin,
        printTempMax: data.printTempMax,
        bedTempMin: data.bedTempMin,
        bedTempMax: data.bedTempMax,
      },
    });
  }

  /**
   * Delete a consumable type (with referential integrity check)
   */
  static async delete(userId: string, typeId: string): Promise<void> {
    // Check if type exists and belongs to user
    const consumableType = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });

    if (!consumableType) {
      throw new Error('Consumable type not found');
    }

    // Check if type has associated consumables
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
