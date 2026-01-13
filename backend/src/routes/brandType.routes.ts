import { Router, Request, Response } from 'express';
import { BrandTypeService } from '../services/brandType.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/brand-types/brand/:brandId
 * 获取品牌的所有类型配置
 */
router.get('/brand/:brandId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const brandTypes = await BrandTypeService.findByBrand(req.user.userId, req.params.brandId);
    res.json({ success: true, data: brandTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get brand types';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/brand-types/brand/:brandId/type/:typeId
 * 获取特定品牌特定类型的配置
 */
router.get('/brand/:brandId/type/:typeId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const brandType = await BrandTypeService.findByBrandAndType(
      req.user.userId,
      req.params.brandId,
      req.params.typeId
    );

    if (!brandType) {
      res.status(404).json({ success: false, error: 'Brand type configuration not found' });
      return;
    }

    res.json({ success: true, data: brandType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get brand type';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/brand-types
 * 创建品牌类型配置
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId, typeId, printTempMin, printTempMax, bedTempMin, bedTempMax, notes } = req.body;

    if (!brandId || !typeId) {
      res.status(400).json({ success: false, error: 'brandId and typeId are required' });
      return;
    }

    const brandType = await BrandTypeService.create(req.user.userId, {
      brandId,
      typeId,
      printTempMin,
      printTempMax,
      bedTempMin,
      bedTempMax,
      notes,
    });

    res.status(201).json({ success: true, data: brandType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create brand type';
    const status = message.includes('not found')
      ? 404
      : message.includes('already exists')
        ? 409
        : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/brand-types/brand/:brandId/batch
 * 批量更新品牌的类型配置
 */
router.put('/brand/:brandId/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      res.status(400).json({ success: false, error: 'configs must be an array' });
      return;
    }

    const brandTypes = await BrandTypeService.upsertMany(
      req.user.userId,
      req.params.brandId,
      configs
    );

    res.json({ success: true, data: brandTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update brand types';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/brand-types/:id
 * 更新单个品牌类型配置
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { printTempMin, printTempMax, bedTempMin, bedTempMax, notes } = req.body;

    const brandType = await BrandTypeService.update(req.user.userId, req.params.id, {
      printTempMin,
      printTempMax,
      bedTempMin,
      bedTempMax,
      notes,
    });

    res.json({ success: true, data: brandType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update brand type';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/brand-types/:id
 * 删除单个品牌类型配置
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await BrandTypeService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Brand type configuration deleted' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete brand type';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
