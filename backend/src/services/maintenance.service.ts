import { prisma } from '../db';

export interface MaintenanceRecordResponse {
  id: string;
  userId: string;
  date: Date;
  type: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaintenanceData {
  date: Date;
  type: string;
  description?: string;
}

export interface UpdateMaintenanceData {
  date?: Date;
  type?: string;
  description?: string;
}

// 有效的保养类型
export const VALID_MAINTENANCE_TYPES = [
  'cleaning',
  'lubrication',
  'replacement',
  'calibration',
  'other',
];

export class MaintenanceService {
  /**
   * 创建保养记录
   */
  static async create(
    userId: string,
    data: CreateMaintenanceData
  ): Promise<MaintenanceRecordResponse> {
    const { date, type, description } = data;

    // 验证保养类型
    if (!VALID_MAINTENANCE_TYPES.includes(type)) {
      throw new Error('Invalid maintenance type');
    }

    return prisma.maintenanceRecord.create({
      data: {
        userId,
        date,
        type,
        description,
      },
    });
  }

  /**
   * 获取用户所有保养记录（按保养时间倒序）
   */
  static async findAllByUser(userId: string): Promise<MaintenanceRecordResponse[]> {
    return prisma.maintenanceRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * 获取单个保养记录
   */
  static async findById(userId: string, id: string): Promise<MaintenanceRecordResponse> {
    const record = await prisma.maintenanceRecord.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw new Error('Record not found');
    }

    return record;
  }

  /**
   * 更新保养记录
   */
  static async update(
    userId: string,
    id: string,
    data: UpdateMaintenanceData
  ): Promise<MaintenanceRecordResponse> {
    // 检查记录是否存在且属于该用户
    const existingRecord = await prisma.maintenanceRecord.findFirst({
      where: { id, userId },
    });

    if (!existingRecord) {
      throw new Error('Record not found');
    }

    // 如果更新类型，验证类型有效性
    if (data.type && !VALID_MAINTENANCE_TYPES.includes(data.type)) {
      throw new Error('Invalid maintenance type');
    }

    return prisma.maintenanceRecord.update({
      where: { id },
      data: {
        date: data.date,
        type: data.type,
        description: data.description,
      },
    });
  }

  /**
   * 删除保养记录
   */
  static async delete(userId: string, id: string): Promise<void> {
    // 检查记录是否存在且属于该用户
    const record = await prisma.maintenanceRecord.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw new Error('Record not found');
    }

    await prisma.maintenanceRecord.delete({
      where: { id },
    });
  }
}

export default MaintenanceService;
