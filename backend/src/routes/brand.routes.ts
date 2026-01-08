import { Router, Request, Response } from 'express';
import { BrandService } from '../services/brand.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All brand routes require authentication
router.use(authMiddleware);

/**
 * GET /api/brands
 * Get all brands for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const brands = await BrandService.findAllByUser(req.user.userId);
    res.json({ success: true, data: brands });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get brands';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/brands
 * Create a new brand
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description, website } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Field name is required' });
      return;
    }

    const brand = await BrandService.create(req.user.userId, {
      name: name.trim(),
      description: description?.trim(),
      website: website?.trim(),
    });

    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create brand';
    const status = message === 'Brand name already exists' ? 409 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/brands/:id
 * Get a single brand by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const brand = await BrandService.findById(req.user.userId, req.params.id);
    res.json({ success: true, data: brand });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get brand';
    const status = message === 'Brand not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/brands/:id
 * Update a brand
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description, website } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ success: false, error: 'Field name cannot be empty' });
      return;
    }

    const brand = await BrandService.update(req.user.userId, req.params.id, {
      name: name?.trim(),
      description: description?.trim(),
      website: website?.trim(),
    });

    res.json({ success: true, data: brand });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update brand';
    let status = 500;
    if (message === 'Brand not found') status = 404;
    if (message === 'Brand name already exists') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/brands/:id
 * Delete a brand
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await BrandService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Brand deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete brand';
    let status = 500;
    if (message === 'Brand not found') status = 404;
    if (message === 'Cannot delete brand with existing consumables') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
