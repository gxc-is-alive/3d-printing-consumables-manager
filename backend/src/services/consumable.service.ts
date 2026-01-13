import { prisma } from '../db';

export interface ConsumableResponse {
  id: string;
  userId: string;
  brandId: string;
  typeId: string;
  color: string;
  colorHex: string | null;
  weight: number;
  remainingWeight: number;
  price: number;
  purchaseDate: Date;
  openedAt: Date | null;
  isOpened: boolean;
  openedDays: number | null; // Days since opened, null if not opened
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  brand?: {
    id: string;
    name: string;
  };
  type?: {
    id: string;
    name: string;
  };
}

/**
 * Calculate the number of days since a consumable was opened
 * @param openedAt - The date when the consumable was opened
 * @param referenceDate - Optional reference date (defaults to current date)
 * @returns Number of days since opened, or null if not opened
 */
export function calculateOpenedDays(openedAt: Date | null, referenceDate?: Date): number | null {
  if (!openedAt) {
    return null;
  }

  const reference = referenceDate || new Date();
  const openedDate = new Date(openedAt);

  // Calculate difference in milliseconds
  const diffMs = reference.getTime() - openedDate.getTime();

  // Convert to days (floor to get complete days)
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Return 0 if negative (opened in the future, edge case)
  return Math.max(0, diffDays);
}

/**
 * Add openedDays field to a consumable object
 */
function addOpenedDays<T extends { openedAt: Date | null; isOpened: boolean }>(
  consumable: T
): T & { openedDays: number | null } {
  return {
    ...consumable,
    openedDays: consumable.isOpened ? calculateOpenedDays(consumable.openedAt) : null,
  };
}

export interface CreateConsumableData {
  brandId: string;
  typeId: string;
  color: string;
  colorHex?: string;
  weight: number;
  price: number;
  purchaseDate: Date;
  notes?: string;
}

export interface BatchCreateConsumableData extends CreateConsumableData {
  quantity: number;
  isOpened?: boolean;
  openedAt?: Date;
}

export interface BatchCreateResponse {
  consumables: ConsumableResponse[];
  count: number;
}

export interface UpdateConsumableData {
  brandId?: string;
  typeId?: string;
  color?: string;
  colorHex?: string;
  weight?: number;
  remainingWeight?: number;
  price?: number;
  purchaseDate?: Date;
  notes?: string;
}

export interface ConsumableFilters {
  brandId?: string;
  typeId?: string;
  color?: string;
  colorHex?: string;
  isOpened?: boolean;
}

// Validate hex color format
function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

export class ConsumableService {
  /**
   * Batch create consumables for a user
   * Uses transaction to ensure atomicity - all or nothing
   */
  static async batchCreate(
    userId: string,
    data: BatchCreateConsumableData
  ): Promise<BatchCreateResponse> {
    const {
      brandId,
      typeId,
      color,
      colorHex,
      weight,
      price,
      purchaseDate,
      notes,
      quantity,
      isOpened = false,
      openedAt,
    } = data;

    // Validate quantity
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Validate brand exists and belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });
    if (!brand) {
      throw new Error('Brand not found');
    }

    // Validate type exists and belongs to user
    const type = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });
    if (!type) {
      throw new Error('Consumable type not found');
    }

    // Validate colorHex format if provided
    if (colorHex && !isValidHexColor(colorHex)) {
      throw new Error('Invalid color format');
    }

    // Validate weight and price are positive
    if (weight <= 0) {
      throw new Error('Weight must be positive');
    }
    if (price < 0) {
      throw new Error('Price must be positive');
    }

    // Determine opened status and date
    const finalIsOpened = isOpened;
    const finalOpenedAt = isOpened ? openedAt || new Date() : null;

    // Use transaction to create all consumables atomically
    const consumables = await prisma.$transaction(async (tx) => {
      const created: Array<{
        id: string;
        userId: string;
        brandId: string;
        typeId: string;
        color: string;
        colorHex: string | null;
        weight: number;
        remainingWeight: number;
        price: number;
        purchaseDate: Date;
        openedAt: Date | null;
        isOpened: boolean;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        brand: { id: string; name: string };
        type: { id: string; name: string };
      }> = [];

      for (let i = 0; i < quantity; i++) {
        const consumable = await tx.consumable.create({
          data: {
            userId,
            brandId,
            typeId,
            color,
            colorHex,
            weight,
            remainingWeight: weight,
            price,
            purchaseDate,
            notes,
            isOpened: finalIsOpened,
            openedAt: finalOpenedAt,
          },
          include: {
            brand: { select: { id: true, name: true } },
            type: { select: { id: true, name: true } },
          },
        });
        created.push(consumable);
      }

      return created;
    });

    return {
      consumables: consumables.map(addOpenedDays),
      count: consumables.length,
    };
  }

  /**
   * Create a new consumable for a user
   */
  static async create(userId: string, data: CreateConsumableData): Promise<ConsumableResponse> {
    const { brandId, typeId, color, colorHex, weight, price, purchaseDate, notes } = data;

    // Validate brand exists and belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });
    if (!brand) {
      throw new Error('Brand not found');
    }

    // Validate type exists and belongs to user
    const type = await prisma.consumableType.findFirst({
      where: { id: typeId, userId },
    });
    if (!type) {
      throw new Error('Consumable type not found');
    }

    // Validate colorHex format if provided
    if (colorHex && !isValidHexColor(colorHex)) {
      throw new Error('Invalid color format');
    }

    // Validate weight and price are positive
    if (weight <= 0) {
      throw new Error('Weight must be positive');
    }
    if (price < 0) {
      throw new Error('Price must be positive');
    }

    const consumable = await prisma.consumable.create({
      data: {
        userId,
        brandId,
        typeId,
        color,
        colorHex,
        weight,
        remainingWeight: weight, // Initially, remaining = total weight
        price,
        purchaseDate,
        notes,
      },
      include: {
        brand: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    });

    return addOpenedDays(consumable);
  }

  /**
   * Get all consumables for a user with optional filters
   */
  static async findAllByUser(
    userId: string,
    filters?: ConsumableFilters
  ): Promise<ConsumableResponse[]> {
    const where: Record<string, unknown> = { userId };

    if (filters?.brandId) {
      where.brandId = filters.brandId;
    }
    if (filters?.typeId) {
      where.typeId = filters.typeId;
    }
    if (filters?.color) {
      where.color = { contains: filters.color };
    }
    if (filters?.colorHex) {
      where.colorHex = { contains: filters.colorHex };
    }
    if (filters?.isOpened !== undefined) {
      where.isOpened = filters.isOpened;
    }

    const consumables = await prisma.consumable.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return consumables.map(addOpenedDays);
  }

  /**
   * Get a single consumable by ID (with user ownership check)
   */
  static async findById(userId: string, consumableId: string): Promise<ConsumableResponse> {
    const consumable = await prisma.consumable.findFirst({
      where: { id: consumableId, userId },
      include: {
        brand: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    });

    if (!consumable) {
      throw new Error('Consumable not found');
    }

    return addOpenedDays(consumable);
  }

  /**
   * Update a consumable
   */
  static async update(
    userId: string,
    consumableId: string,
    data: UpdateConsumableData
  ): Promise<ConsumableResponse> {
    // Check if consumable exists and belongs to user
    const existingConsumable = await prisma.consumable.findFirst({
      where: { id: consumableId, userId },
    });

    if (!existingConsumable) {
      throw new Error('Consumable not found');
    }

    // Validate brand if being changed
    if (data.brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: data.brandId, userId },
      });
      if (!brand) {
        throw new Error('Brand not found');
      }
    }

    // Validate type if being changed
    if (data.typeId) {
      const type = await prisma.consumableType.findFirst({
        where: { id: data.typeId, userId },
      });
      if (!type) {
        throw new Error('Consumable type not found');
      }
    }

    // Validate colorHex format if provided
    if (data.colorHex && !isValidHexColor(data.colorHex)) {
      throw new Error('Invalid color format');
    }

    // Validate weight and price if provided
    if (data.weight !== undefined && data.weight <= 0) {
      throw new Error('Weight must be positive');
    }
    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price must be positive');
    }
    if (data.remainingWeight !== undefined && data.remainingWeight < 0) {
      throw new Error('Remaining weight cannot be negative');
    }

    const consumable = await prisma.consumable.update({
      where: { id: consumableId },
      data: {
        brandId: data.brandId,
        typeId: data.typeId,
        color: data.color,
        colorHex: data.colorHex,
        weight: data.weight,
        remainingWeight: data.remainingWeight,
        price: data.price,
        purchaseDate: data.purchaseDate,
        notes: data.notes,
      },
      include: {
        brand: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    });

    return addOpenedDays(consumable);
  }

  /**
   * Delete a consumable
   */
  static async delete(userId: string, consumableId: string): Promise<void> {
    // Check if consumable exists and belongs to user
    const consumable = await prisma.consumable.findFirst({
      where: { id: consumableId, userId },
    });

    if (!consumable) {
      throw new Error('Consumable not found');
    }

    await prisma.consumable.delete({
      where: { id: consumableId },
    });
  }

  /**
   * Mark a consumable as opened
   */
  static async markAsOpened(
    userId: string,
    consumableId: string,
    openedAt?: Date
  ): Promise<ConsumableResponse> {
    // Check if consumable exists and belongs to user
    const consumable = await prisma.consumable.findFirst({
      where: { id: consumableId, userId },
    });

    if (!consumable) {
      throw new Error('Consumable not found');
    }

    const updated = await prisma.consumable.update({
      where: { id: consumableId },
      data: {
        isOpened: true,
        openedAt: openedAt || new Date(),
      },
      include: {
        brand: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    });

    return addOpenedDays(updated);
  }
}

export default ConsumableService;
