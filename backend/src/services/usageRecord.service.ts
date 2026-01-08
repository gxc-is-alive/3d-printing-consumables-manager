import { prisma } from '../db';

export interface UsageRecordResponse {
  id: string;
  userId: string;
  consumableId: string;
  amountUsed: number;
  usageDate: Date;
  projectName: string | null;
  notes: string | null;
  createdAt: Date;
  consumable?: {
    id: string;
    color: string;
    colorHex: string | null;
    remainingWeight: number;
    brand?: {
      id: string;
      name: string;
    };
    type?: {
      id: string;
      name: string;
    };
  };
}

export interface CreateUsageRecordData {
  consumableId: string;
  amountUsed: number;
  usageDate: Date;
  projectName?: string;
  notes?: string;
}

export interface UpdateUsageRecordData {
  amountUsed?: number;
  usageDate?: Date;
  projectName?: string;
  notes?: string;
}

export interface UsageRecordFilters {
  consumableId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class UsageRecordService {
  /**
   * Create a new usage record and deduct from consumable's remaining weight
   * Returns a warning if usage exceeds remaining inventory
   */
  static async create(
    userId: string,
    data: CreateUsageRecordData
  ): Promise<{ record: UsageRecordResponse; warning?: string }> {
    const { consumableId, amountUsed, usageDate, projectName, notes } = data;

    // Validate amountUsed is positive
    if (amountUsed <= 0) {
      throw new Error('Amount used must be positive');
    }

    // Validate consumable exists and belongs to user
    const consumable = await prisma.consumable.findFirst({
      where: { id: consumableId, userId },
    });

    if (!consumable) {
      throw new Error('Consumable not found');
    }

    let warning: string | undefined;

    // Check if usage exceeds remaining inventory (warn but allow)
    if (amountUsed > consumable.remainingWeight) {
      warning = 'Warning: Usage amount exceeds remaining inventory';
    }

    // Calculate new remaining weight (minimum 0)
    const newRemainingWeight = Math.max(0, consumable.remainingWeight - amountUsed);

    // Use transaction to ensure atomicity
    const [usageRecord] = await prisma.$transaction([
      prisma.usageRecord.create({
        data: {
          userId,
          consumableId,
          amountUsed,
          usageDate,
          projectName,
          notes,
        },
        include: {
          consumable: {
            select: {
              id: true,
              color: true,
              colorHex: true,
              remainingWeight: true,
              brand: { select: { id: true, name: true } },
              type: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.consumable.update({
        where: { id: consumableId },
        data: { remainingWeight: newRemainingWeight },
      }),
    ]);

    // Fetch updated consumable info
    const updatedRecord = await prisma.usageRecord.findUnique({
      where: { id: usageRecord.id },
      include: {
        consumable: {
          select: {
            id: true,
            color: true,
            colorHex: true,
            remainingWeight: true,
            brand: { select: { id: true, name: true } },
            type: { select: { id: true, name: true } },
          },
        },
      },
    });

    return { record: updatedRecord!, warning };
  }

  /**
   * Get all usage records for a user with optional filters
   */
  static async findAllByUser(
    userId: string,
    filters?: UsageRecordFilters
  ): Promise<UsageRecordResponse[]> {
    const where: Record<string, unknown> = { userId };

    if (filters?.consumableId) {
      where.consumableId = filters.consumableId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.usageDate = {};
      if (filters.startDate) {
        (where.usageDate as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.usageDate as Record<string, Date>).lte = filters.endDate;
      }
    }

    return prisma.usageRecord.findMany({
      where,
      include: {
        consumable: {
          select: {
            id: true,
            color: true,
            colorHex: true,
            remainingWeight: true,
            brand: { select: { id: true, name: true } },
            type: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { usageDate: 'desc' },
    });
  }

  /**
   * Get a single usage record by ID (with user ownership check)
   */
  static async findById(userId: string, recordId: string): Promise<UsageRecordResponse> {
    const record = await prisma.usageRecord.findFirst({
      where: { id: recordId, userId },
      include: {
        consumable: {
          select: {
            id: true,
            color: true,
            colorHex: true,
            remainingWeight: true,
            brand: { select: { id: true, name: true } },
            type: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!record) {
      throw new Error('Usage record not found');
    }

    return record;
  }

  /**
   * Update a usage record and recalculate inventory
   */
  static async update(
    userId: string,
    recordId: string,
    data: UpdateUsageRecordData
  ): Promise<{ record: UsageRecordResponse; warning?: string }> {
    // Check if record exists and belongs to user
    const existingRecord = await prisma.usageRecord.findFirst({
      where: { id: recordId, userId },
      include: { consumable: true },
    });

    if (!existingRecord) {
      throw new Error('Usage record not found');
    }

    // Validate amountUsed if provided
    if (data.amountUsed !== undefined && data.amountUsed <= 0) {
      throw new Error('Amount used must be positive');
    }

    let warning: string | undefined;
    const newAmountUsed = data.amountUsed ?? existingRecord.amountUsed;
    const amountDifference = newAmountUsed - existingRecord.amountUsed;

    // Calculate new remaining weight for consumable
    const consumable = existingRecord.consumable;
    const newRemainingWeight = Math.max(0, consumable.remainingWeight - amountDifference);

    // Check if the update would exceed inventory
    if (amountDifference > 0 && amountDifference > consumable.remainingWeight) {
      warning = 'Warning: Usage amount exceeds remaining inventory';
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction([
      prisma.usageRecord.update({
        where: { id: recordId },
        data: {
          amountUsed: data.amountUsed,
          usageDate: data.usageDate,
          projectName: data.projectName,
          notes: data.notes,
        },
      }),
      prisma.consumable.update({
        where: { id: consumable.id },
        data: { remainingWeight: newRemainingWeight },
      }),
    ]);

    // Fetch updated record with new remaining weight
    const finalRecord = await prisma.usageRecord.findUnique({
      where: { id: recordId },
      include: {
        consumable: {
          select: {
            id: true,
            color: true,
            colorHex: true,
            remainingWeight: true,
            brand: { select: { id: true, name: true } },
            type: { select: { id: true, name: true } },
          },
        },
      },
    });

    return { record: finalRecord!, warning };
  }

  /**
   * Delete a usage record and restore inventory
   */
  static async delete(userId: string, recordId: string): Promise<void> {
    // Check if record exists and belongs to user
    const record = await prisma.usageRecord.findFirst({
      where: { id: recordId, userId },
      include: { consumable: true },
    });

    if (!record) {
      throw new Error('Usage record not found');
    }

    // Restore the amount to consumable's remaining weight
    const newRemainingWeight = Math.min(
      record.consumable.weight, // Don't exceed original weight
      record.consumable.remainingWeight + record.amountUsed
    );

    // Use transaction to ensure atomicity
    await prisma.$transaction([
      prisma.usageRecord.delete({
        where: { id: recordId },
      }),
      prisma.consumable.update({
        where: { id: record.consumableId },
        data: { remainingWeight: newRemainingWeight },
      }),
    ]);
  }

  /**
   * Get total usage for a consumable
   */
  static async getTotalUsageForConsumable(userId: string, consumableId: string): Promise<number> {
    const result = await prisma.usageRecord.aggregate({
      where: { userId, consumableId },
      _sum: { amountUsed: true },
    });

    return result._sum.amountUsed ?? 0;
  }
}

export default UsageRecordService;
