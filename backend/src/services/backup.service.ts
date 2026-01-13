import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface BackupData {
  exportedAt: string;
  version: string;
  users: any[];
  brands: any[];
  consumableTypes: any[];
  consumables: any[];
  usageRecords: any[];
}

export const backupService = {
  // 导出用户的所有数据为 JSON 备份
  async exportUserData(userId: string): Promise<BackupData> {
    const [brands, consumableTypes, consumables, usageRecords] = await Promise.all([
      prisma.brand.findMany({ where: { userId } }),
      prisma.consumableType.findMany({ where: { userId } }),
      prisma.consumable.findMany({ where: { userId } }),
      prisma.usageRecord.findMany({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      users: [], // 不导出用户敏感信息
      brands,
      consumableTypes,
      consumables,
      usageRecords,
    };
  },

  // 导入用户数据（从备份恢复）
  async importUserData(
    userId: string,
    data: BackupData
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 使用事务确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 先删除用户现有数据
        await tx.usageRecord.deleteMany({ where: { userId } });
        await tx.consumable.deleteMany({ where: { userId } });
        await tx.brand.deleteMany({ where: { userId } });
        await tx.consumableType.deleteMany({ where: { userId } });

        // 创建 ID 映射表
        const brandIdMap = new Map<string, string>();
        const typeIdMap = new Map<string, string>();
        const consumableIdMap = new Map<string, string>();

        // 导入品牌
        for (const brand of data.brands) {
          const newBrand = await tx.brand.create({
            data: {
              name: brand.name,
              description: brand.description,
              website: brand.website,
              userId,
            },
          });
          brandIdMap.set(brand.id, newBrand.id);
        }

        // 导入耗材类型
        for (const type of data.consumableTypes) {
          const newType = await tx.consumableType.create({
            data: {
              name: type.name,
              description: type.description,
              userId,
            },
          });
          typeIdMap.set(type.id, newType.id);
        }

        // 导入耗材
        for (const consumable of data.consumables) {
          const newConsumable = await tx.consumable.create({
            data: {
              brandId: brandIdMap.get(consumable.brandId) || consumable.brandId,
              typeId: typeIdMap.get(consumable.typeId) || consumable.typeId,
              color: consumable.color,
              colorHex: consumable.colorHex,
              weight: consumable.weight,
              remainingWeight: consumable.remainingWeight,
              price: consumable.price,
              purchaseDate: new Date(consumable.purchaseDate),
              openedAt: consumable.openedAt ? new Date(consumable.openedAt) : null,
              isOpened: consumable.isOpened,
              notes: consumable.notes,
              userId,
            },
          });
          consumableIdMap.set(consumable.id, newConsumable.id);
        }

        // 导入使用记录
        for (const record of data.usageRecords) {
          await tx.usageRecord.create({
            data: {
              consumableId: consumableIdMap.get(record.consumableId) || record.consumableId,
              amountUsed: record.amountUsed,
              usageDate: new Date(record.usageDate),
              projectName: record.projectName,
              notes: record.notes,
              userId,
            },
          });
        }
      });

      return { success: true, message: '数据恢复成功' };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, message: '数据恢复失败: ' + (error as Error).message };
    }
  },

  // 导出耗材数据为 Excel
  async exportToExcel(userId: string): Promise<Buffer> {
    const consumables = await prisma.consumable.findMany({
      where: { userId },
      include: {
        brand: true,
        type: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const usageRecords = await prisma.usageRecord.findMany({
      where: { userId },
      include: {
        consumable: {
          include: { brand: true, type: true },
        },
      },
      orderBy: { usageDate: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '3D打印耗材管理系统';
    workbook.created = new Date();

    // 耗材清单工作表
    const consumableSheet = workbook.addWorksheet('耗材清单');
    consumableSheet.columns = [
      { header: '品牌', key: 'brand', width: 15 },
      { header: '类型', key: 'type', width: 10 },
      { header: '颜色', key: 'color', width: 12 },
      { header: '颜色代码', key: 'colorHex', width: 12 },
      { header: '总重量(g)', key: 'weight', width: 12 },
      { header: '剩余重量(g)', key: 'remainingWeight', width: 14 },
      { header: '价格(¥)', key: 'price', width: 10 },
      { header: '购买日期', key: 'purchaseDate', width: 12 },
      { header: '开封状态', key: 'isOpened', width: 10 },
      { header: '开封日期', key: 'openedAt', width: 12 },
      { header: '备注', key: 'notes', width: 20 },
    ];

    // 设置表头样式
    consumableSheet.getRow(1).font = { bold: true };
    consumableSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90D9' },
    };
    consumableSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 添加耗材数据
    for (const c of consumables) {
      consumableSheet.addRow({
        brand: c.brand?.name || '',
        type: c.type?.name || '',
        color: c.color,
        colorHex: c.colorHex || '',
        weight: c.weight,
        remainingWeight: c.remainingWeight,
        price: c.price,
        purchaseDate: c.purchaseDate.toISOString().split('T')[0],
        isOpened: c.isOpened ? '已开封' : '未开封',
        openedAt: c.openedAt ? c.openedAt.toISOString().split('T')[0] : '',
        notes: c.notes || '',
      });
    }

    // 使用记录工作表
    const usageSheet = workbook.addWorksheet('使用记录');
    usageSheet.columns = [
      { header: '耗材', key: 'consumable', width: 25 },
      { header: '使用量(g)', key: 'amountUsed', width: 12 },
      { header: '使用日期', key: 'usageDate', width: 12 },
      { header: '项目名称', key: 'projectName', width: 20 },
      { header: '备注', key: 'notes', width: 20 },
    ];

    usageSheet.getRow(1).font = { bold: true };
    usageSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90D9' },
    };
    usageSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const r of usageRecords) {
      const consumableName = r.consumable
        ? `${r.consumable.brand?.name || ''} ${r.consumable.type?.name || ''} ${r.consumable.color}`
        : '';
      usageSheet.addRow({
        consumable: consumableName,
        amountUsed: r.amountUsed,
        usageDate: r.usageDate.toISOString().split('T')[0],
        projectName: r.projectName || '',
        notes: r.notes || '',
      });
    }

    // 统计工作表
    const statsSheet = workbook.addWorksheet('统计汇总');
    statsSheet.columns = [
      { header: '统计项', key: 'item', width: 20 },
      { header: '数值', key: 'value', width: 15 },
    ];

    statsSheet.getRow(1).font = { bold: true };
    statsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90D9' },
    };
    statsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const totalWeight = consumables.reduce((sum, c) => sum + c.weight, 0);
    const totalRemaining = consumables.reduce((sum, c) => sum + c.remainingWeight, 0);
    const totalUsed = usageRecords.reduce((sum, r) => sum + r.amountUsed, 0);
    const totalSpent = consumables.reduce((sum, c) => sum + c.price, 0);

    statsSheet.addRow({ item: '耗材总数', value: consumables.length });
    statsSheet.addRow({ item: '总重量(g)', value: totalWeight });
    statsSheet.addRow({ item: '剩余重量(g)', value: totalRemaining });
    statsSheet.addRow({ item: '已使用(g)', value: totalUsed });
    statsSheet.addRow({ item: '总花费(¥)', value: totalSpent.toFixed(2) });
    statsSheet.addRow({ item: '导出时间', value: new Date().toLocaleString('zh-CN') });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },

  // 导出完整数据库备份（管理员功能）
  async exportFullBackup(): Promise<string> {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    // 复制 SQLite 数据库文件
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      return backupPath;
    }

    throw new Error('数据库文件不存在');
  },
};
