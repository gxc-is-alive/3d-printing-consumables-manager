import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { backupService } from '../services/backup.service';

const router = Router();

// 导出用户数据为 JSON 备份
router.get('/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = await backupService.exportUserData(userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=backup-${new Date().toISOString().split('T')[0]}.json`
    );
    res.json(data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导入用户数据（从备份恢复）
router.post('/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    if (!data || !data.version) {
      return res.status(400).json({ error: '无效的备份文件格式' });
    }

    const result = await backupService.importUserData(userId, data);

    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: '导入失败' });
  }
});

// 导出耗材数据为 Excel
router.get('/excel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const buffer = await backupService.exportToExcel(userId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=consumables-${new Date().toISOString().split('T')[0]}.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: '导出Excel失败' });
  }
});

export default router;
