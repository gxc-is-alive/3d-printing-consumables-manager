import { Router } from 'express';
import authRoutes from './auth.routes';
import brandRoutes from './brand.routes';
import consumableTypeRoutes from './consumableType.routes';
import consumableRoutes from './consumable.routes';
import usageRecordRoutes from './usageRecord.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/brands', brandRoutes);
router.use('/types', consumableTypeRoutes);
router.use('/consumables', consumableRoutes);
router.use('/usages', usageRecordRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
