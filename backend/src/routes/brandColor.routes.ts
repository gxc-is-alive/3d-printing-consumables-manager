import { Router, Request, Response } from 'express';
import { BrandColorService } from '../services/brandColor.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

// All brand color routes require authentication
router.use(authMiddleware);

/**
 * GET /api/brands/:brandId/colors
 * 获取品牌下所有颜色
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId } = req.params;
    const colors = await BrandColorService.findAllByBrand(req.user.userId, brandId);
    res.json({ success: true, data: colors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get colors';
    const status = message === 'Brand not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/brands/:brandId/colors
 * 创建品牌颜色
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId } = req.params;
    const { colorName, colorHex } = req.body;

    const color = await BrandColorService.create(req.user.userId, brandId, {
      colorName,
      colorHex,
    });

    res.status(201).json({ success: true, data: color });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create color';
    let status = 500;
    if (message === 'Brand not found') status = 404;
    if (message === 'Color name is required') status = 400;
    if (message === 'Invalid color hex format') status = 400;
    if (message === 'Color name already exists') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/brands/:brandId/colors/:colorId
 * 更新品牌颜色
 */
router.put('/:colorId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId, colorId } = req.params;
    const { colorName, colorHex } = req.body;

    const color = await BrandColorService.update(req.user.userId, brandId, colorId, {
      colorName,
      colorHex,
    });

    res.json({ success: true, data: color });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update color';
    let status = 500;
    if (message === 'Color not found') status = 404;
    if (message === 'Color name is required') status = 400;
    if (message === 'Invalid color hex format') status = 400;
    if (message === 'Color name already exists') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/brands/:brandId/colors/:colorId
 * 删除品牌颜色
 */
router.delete('/:colorId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId, colorId } = req.params;
    await BrandColorService.delete(req.user.userId, brandId, colorId);
    res.json({ success: true, data: { message: 'Color deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete color';
    const status = message === 'Color not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
