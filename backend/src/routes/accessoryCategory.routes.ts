import { Router, Request, Response } from 'express';
import { AccessoryCategoryService } from '../services/accessoryCategory.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All accessory category routes require authentication
router.use(authMiddleware);

/**
 * GET /api/accessory-categories
 * Get all accessory categories (preset + user's custom)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const categories = await AccessoryCategoryService.findAllByUser(req.user.userId);
    res.json({ success: true, data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/accessory-categories
 * Create a custom accessory category
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Field name is required' });
      return;
    }

    const category = await AccessoryCategoryService.create(req.user.userId, {
      name: name.trim(),
      description: description?.trim(),
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    const status =
      message === 'Category already exists' ||
      message === 'Category name conflicts with preset category'
        ? 400
        : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/accessory-categories/:id
 * Delete a custom accessory category
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await AccessoryCategoryService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Category deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    let status = 500;
    if (message === 'Category not found') status = 404;
    if (message === 'Cannot delete preset category' || message === 'Category has accessories')
      status = 400;
    if (message === 'Access denied') status = 403;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
