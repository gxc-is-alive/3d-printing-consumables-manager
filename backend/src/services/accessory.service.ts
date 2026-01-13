import { prisma } from '../db';

export interface AccessoryResponse {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: number | null;
  purchaseDate: Date | null;
  quantity: number;
  remainingQty: number;
  replacementCycle: number | null;
  lastReplacedAt: Date | null;
  lowStockThreshold: number | null;
  status: string;
  usageType: string;
  inUseStartedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
  };
  usageRecords?: AccessoryUsageResponse[];
}

export interface AccessoryUsageResponse {
  id: string;
  userId: string;
  accessoryId: string;
  usageDate: Date;
  quantity: number;
  purpose: string | null;
  duration: number | null;
  createdAt: Date;
}

export interface CreateAccessoryData {
  categoryId: string;
  name: string;
  brand?: string;
  model?: string;
  price?: number;
  purchaseDate?: Date;
  quantity?: number;
  replacementCycle?: number;
  lowStockThreshold?: number;
  usageType?: 'consumable' | 'durable';
  notes?: string;
}

export interface UpdateAccessoryData {
  categoryId?: string;
  name?: string;
  brand?: string;
  model?: string;
  price?: number;
  purchaseDate?: Date;
  quantity?: number;
  remainingQty?: number;
  replacementCycle?: number;
  lastReplacedAt?: Date;
  lowStockThreshold?: number;
  notes?: string;
}

export interface AccessoryFilters {
  categoryId?: string;
  status?: string;
}

export interface CreateUsageData {
  usageDate: Date;
  quantity: number;
  purpose?: string;
}

export interface AccessoryAlert {
  id: string;
  accessoryId: string;
  accessoryName: string;
  categoryName: string;
  alertType: 'replacement_due' | 'low_stock';
  message: string;
}

// 有效的配件状态
export const VALID_ACCESSORY_STATUSES = ['available', 'in_use', 'low_stock', 'depleted'];

// 有效的配件使用类型
export const VALID_USAGE_TYPES = ['consumable', 'durable'];

/**
 * 根据剩余数量和阈值计算配件状态（仅用于消耗型配件）
 */
function calculateStatus(remainingQty: number, lowStockThreshold: number | null): string {
  if (remainingQty <= 0) {
    return 'depleted';
  }
  if (lowStockThreshold !== null && remainingQty <= lowStockThreshold) {
    return 'low_stock';
  }
  return 'available';
}

export class AccessoryService {
  /**
   * 创建配件
   */
  static async create(userId: string, data: CreateAccessoryData): Promise<AccessoryResponse> {
    const {
      categoryId,
      name,
      brand,
      model,
      price,
      purchaseDate,
      quantity = 1,
      replacementCycle,
      lowStockThreshold,
      usageType = 'consumable',
      notes,
    } = data;

    // 验证必填字段
    if (!name || name.trim() === '') {
      throw new Error('Name is required');
    }

    if (!categoryId) {
      throw new Error('Category is required');
    }

    // 验证使用类型
    if (!VALID_USAGE_TYPES.includes(usageType)) {
      throw new Error('Invalid usage type');
    }

    // 验证分类存在
    const category = await prisma.accessoryCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // 验证分类是预设分类或属于该用户
    if (!category.isPreset && category.userId !== userId) {
      throw new Error('Category not found');
    }

    // 验证数量为正数
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // 计算初始状态
    const status = calculateStatus(quantity, lowStockThreshold ?? null);

    const accessory = await prisma.accessory.create({
      data: {
        userId,
        categoryId,
        name: name.trim(),
        brand,
        model,
        price,
        purchaseDate,
        quantity,
        remainingQty: quantity,
        replacementCycle,
        lowStockThreshold,
        usageType,
        status,
        notes,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return accessory as AccessoryResponse;
  }

  /**
   * 获取用户所有配件（支持筛选）
   */
  static async findAllByUser(
    userId: string,
    filters?: AccessoryFilters
  ): Promise<AccessoryResponse[]> {
    const where: Record<string, unknown> = { userId };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const accessories = await prisma.accessory.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { createdAt: 'desc' }],
    });

    return accessories as AccessoryResponse[];
  }

  /**
   * 获取单个配件详情（包含使用记录）
   */
  static async findById(userId: string, id: string): Promise<AccessoryResponse> {
    const accessory = await prisma.accessory.findFirst({
      where: { id, userId },
      include: {
        category: { select: { id: true, name: true } },
        usageRecords: {
          orderBy: { usageDate: 'desc' },
        },
      },
    });

    if (!accessory) {
      throw new Error('Accessory not found');
    }

    return accessory as AccessoryResponse;
  }

  /**
   * 更新配件
   */
  static async update(
    userId: string,
    id: string,
    data: UpdateAccessoryData
  ): Promise<AccessoryResponse> {
    // 检查配件是否存在且属于该用户
    const existingAccessory = await prisma.accessory.findFirst({
      where: { id, userId },
    });

    if (!existingAccessory) {
      throw new Error('Accessory not found');
    }

    // 如果更新分类，验证分类存在
    if (data.categoryId) {
      const category = await prisma.accessoryCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      if (!category.isPreset && category.userId !== userId) {
        throw new Error('Category not found');
      }
    }

    // 验证名称不为空
    if (data.name !== undefined && data.name.trim() === '') {
      throw new Error('Name is required');
    }

    // 验证数量为正数
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // 验证剩余数量不为负
    if (data.remainingQty !== undefined && data.remainingQty < 0) {
      throw new Error('Remaining quantity cannot be negative');
    }

    // 计算新状态（仅当配件不在使用中时）
    const newRemainingQty = data.remainingQty ?? existingAccessory.remainingQty;
    const newThreshold =
      data.lowStockThreshold !== undefined
        ? data.lowStockThreshold
        : existingAccessory.lowStockThreshold;

    // 如果配件正在使用中，保持 in_use 状态
    const newStatus =
      existingAccessory.status === 'in_use'
        ? 'in_use'
        : calculateStatus(newRemainingQty, newThreshold);

    const accessory = await prisma.accessory.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        name: data.name?.trim(),
        brand: data.brand,
        model: data.model,
        price: data.price,
        purchaseDate: data.purchaseDate,
        quantity: data.quantity,
        remainingQty: data.remainingQty,
        replacementCycle: data.replacementCycle,
        lastReplacedAt: data.lastReplacedAt,
        lowStockThreshold: data.lowStockThreshold,
        status: newStatus,
        notes: data.notes,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return accessory as AccessoryResponse;
  }

  /**
   * 删除配件
   */
  static async delete(userId: string, id: string): Promise<void> {
    // 检查配件是否存在且属于该用户
    const accessory = await prisma.accessory.findFirst({
      where: { id, userId },
    });

    if (!accessory) {
      throw new Error('Accessory not found');
    }

    // 检查配件是否正在使用中
    if (accessory.status === 'in_use') {
      throw new Error('Cannot delete accessory that is in use');
    }

    await prisma.accessory.delete({
      where: { id },
    });
  }

  /**
   * 开始使用耐用型配件
   */
  static async startUsing(userId: string, id: string): Promise<AccessoryResponse> {
    const accessory = await prisma.accessory.findFirst({
      where: { id, userId },
    });

    if (!accessory) {
      throw new Error('Accessory not found');
    }

    // 验证是耐用型配件
    if (accessory.usageType !== 'durable') {
      throw new Error('Only durable accessories can be marked as in use');
    }

    // 验证当前不在使用中
    if (accessory.status === 'in_use') {
      throw new Error('Accessory is already in use');
    }

    const updated = await prisma.accessory.update({
      where: { id },
      data: {
        status: 'in_use',
        inUseStartedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return updated as AccessoryResponse;
  }

  /**
   * 结束使用耐用型配件
   */
  static async stopUsing(userId: string, id: string, notes?: string): Promise<AccessoryResponse> {
    const accessory = await prisma.accessory.findFirst({
      where: { id, userId },
    });

    if (!accessory) {
      throw new Error('Accessory not found');
    }

    // 验证当前在使用中
    if (accessory.status !== 'in_use') {
      throw new Error('Accessory is not in use');
    }

    // 计算使用时长（分钟）
    const duration = accessory.inUseStartedAt
      ? Math.floor((new Date().getTime() - accessory.inUseStartedAt.getTime()) / (1000 * 60))
      : null;

    // 计算新状态
    const newStatus = calculateStatus(accessory.remainingQty, accessory.lowStockThreshold);

    // 使用事务更新配件状态并创建使用记录
    const [, updated] = await prisma.$transaction([
      prisma.accessoryUsage.create({
        data: {
          userId,
          accessoryId: id,
          usageDate: new Date(),
          quantity: 0, // 耐用型配件不消耗数量
          purpose: notes,
          duration,
        },
      }),
      prisma.accessory.update({
        where: { id },
        data: {
          status: newStatus,
          inUseStartedAt: null,
        },
        include: {
          category: { select: { id: true, name: true } },
          usageRecords: {
            orderBy: { usageDate: 'desc' },
          },
        },
      }),
    ]);

    return updated as AccessoryResponse;
  }

  /**
   * 记录配件使用
   */
  static async recordUsage(
    userId: string,
    accessoryId: string,
    data: CreateUsageData
  ): Promise<AccessoryResponse> {
    const { usageDate, quantity, purpose } = data;

    // 检查配件是否存在且属于该用户
    const accessory = await prisma.accessory.findFirst({
      where: { id: accessoryId, userId },
    });

    if (!accessory) {
      throw new Error('Accessory not found');
    }

    // 验证使用数量
    if (quantity <= 0) {
      throw new Error('Usage quantity must be positive');
    }

    if (quantity > accessory.remainingQty) {
      throw new Error('Usage quantity exceeds remaining');
    }

    // 计算新的剩余数量和状态
    const newRemainingQty = accessory.remainingQty - quantity;
    const newStatus = calculateStatus(newRemainingQty, accessory.lowStockThreshold);

    // 使用事务创建使用记录并更新配件
    const [, updatedAccessory] = await prisma.$transaction([
      prisma.accessoryUsage.create({
        data: {
          userId,
          accessoryId,
          usageDate,
          quantity,
          purpose,
        },
      }),
      prisma.accessory.update({
        where: { id: accessoryId },
        data: {
          remainingQty: newRemainingQty,
          status: newStatus,
        },
        include: {
          category: { select: { id: true, name: true } },
          usageRecords: {
            orderBy: { usageDate: 'desc' },
          },
        },
      }),
    ]);

    return updatedAccessory as AccessoryResponse;
  }

  /**
   * 获取配件提醒
   */
  static async getAlerts(userId: string): Promise<AccessoryAlert[]> {
    const accessories = await prisma.accessory.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    const alerts: AccessoryAlert[] = [];
    const now = new Date();

    for (const accessory of accessories) {
      // 检查更换周期提醒
      if (accessory.replacementCycle && accessory.lastReplacedAt) {
        const daysSinceReplacement = Math.floor(
          (now.getTime() - accessory.lastReplacedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceReplacement >= accessory.replacementCycle) {
          alerts.push({
            id: `replacement-${accessory.id}`,
            accessoryId: accessory.id,
            accessoryName: accessory.name,
            categoryName: accessory.category?.name || '',
            alertType: 'replacement_due',
            message: `配件 "${accessory.name}" 已超过更换周期（${daysSinceReplacement}天），建议更换`,
          });
        }
      }

      // 检查库存不足提醒
      if (accessory.status === 'low_stock' || accessory.status === 'depleted') {
        alerts.push({
          id: `stock-${accessory.id}`,
          accessoryId: accessory.id,
          accessoryName: accessory.name,
          categoryName: accessory.category?.name || '',
          alertType: 'low_stock',
          message:
            accessory.status === 'depleted'
              ? `配件 "${accessory.name}" 已用完，请及时补充`
              : `配件 "${accessory.name}" 库存不足（剩余${accessory.remainingQty}），请及时补充`,
        });
      }
    }

    return alerts;
  }
}

export default AccessoryService;
