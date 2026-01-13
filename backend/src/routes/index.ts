import { Router } from 'express';
import authRoutes from './auth.routes';
import brandRoutes from './brand.routes';
import brandConfigFileRoutes from './brandConfigFile.routes';
import brandTypeRoutes from './brandType.routes';
import consumableTypeRoutes from './consumableType.routes';
import consumableRoutes from './consumable.routes';
import usageRecordRoutes from './usageRecord.routes';
import dashboardRoutes from './dashboard.routes';
import backupRoutes from './backup.routes';
import maintenanceRoutes from './maintenance.routes';
import accessoryCategoryRoutes from './accessoryCategory.routes';
import accessoryRoutes from './accessory.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/brands', brandRoutes);
router.use('/', brandConfigFileRoutes); // 品牌配置文件路由（包含 /brands/:brandId/files 和 /brand-files/:fileId）
router.use('/brand-types', brandTypeRoutes); // 品牌类型配置路由
router.use('/types', consumableTypeRoutes);
router.use('/consumables', consumableRoutes);
router.use('/usages', usageRecordRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/backup', backupRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/accessory-categories', accessoryCategoryRoutes);
router.use('/accessories', accessoryRoutes);

export default router;
