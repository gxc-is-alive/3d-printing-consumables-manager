import { Router, Request, Response } from 'express';
import { AccessoryService } from '../services/accessory.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All accessory routes require authentication
router.use(authMiddleware);

/**
 * GET /api/accessories/alerts
 * Get accessory alerts for the authenticated user
 * Note: This route must be defined before /:id to avoid conflicts
 */
router.get('/alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const alerts = await AccessoryService.getAlerts(req.user.userId);
    res.json({ success: true, data: alerts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get alerts';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/accessories
 * Get all accessories for the authenticated user (with optional filters)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { categoryId, status } = req.query;
    const filters: { categoryId?: string; status?: string } = {};

    if (categoryId && typeof categoryId === 'string') {
      filters.categoryId = categoryId;
    }
    if (status && typeof status === 'string') {
      filters.status = status;
    }

    const accessories = await AccessoryService.findAllByUser(req.user.userId, filters);
    res.json({ success: true, data: accessories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get accessories';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/accessories
 * Create a new accessory
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const {
      categoryId,
      name,
      brand,
      model,
      price,
      purchaseDate,
      quantity,
      replacementCycle,
      lowStockThreshold,
      usageType,
      notes,
    } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Field name is required' });
      return;
    }

    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Field categoryId is required' });
      return;
    }

    const accessory = await AccessoryService.create(req.user.userId, {
      categoryId,
      name: name.trim(),
      brand: brand?.trim(),
      model: model?.trim(),
      price: price ? parseFloat(price) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      quantity: quantity ? parseInt(quantity, 10) : undefined,
      replacementCycle: replacementCycle ? parseInt(replacementCycle, 10) : undefined,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined,
      usageType: usageType || 'consumable',
      notes: notes?.trim(),
    });

    res.status(201).json({ success: true, data: accessory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create accessory';
    const status =
      message === 'Category not found' ? 404 : message.includes('required') ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/accessories/:id
 * Get a single accessory by ID (with usage records)
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const accessory = await AccessoryService.findById(req.user.userId, req.params.id);
    res.json({ success: true, data: accessory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get accessory';
    const status = message === 'Accessory not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/accessories/:id
 * Update an accessory
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const {
      categoryId,
      name,
      brand,
      model,
      price,
      purchaseDate,
      quantity,
      remainingQty,
      replacementCycle,
      lastReplacedAt,
      lowStockThreshold,
      notes,
    } = req.body;

    const accessory = await AccessoryService.update(req.user.userId, req.params.id, {
      categoryId,
      name: name?.trim(),
      brand: brand?.trim(),
      model: model?.trim(),
      price: price !== undefined ? parseFloat(price) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
      remainingQty: remainingQty !== undefined ? parseInt(remainingQty, 10) : undefined,
      replacementCycle: replacementCycle !== undefined ? parseInt(replacementCycle, 10) : undefined,
      lastReplacedAt: lastReplacedAt ? new Date(lastReplacedAt) : undefined,
      lowStockThreshold:
        lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : undefined,
      notes: notes?.trim(),
    });

    res.json({ success: true, data: accessory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update accessory';
    const status =
      message === 'Accessory not found' || message === 'Category not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/accessories/:id
 * Delete an accessory
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await AccessoryService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Accessory deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete accessory';
    const status = message === 'Accessory not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/accessories/:id/usage
 * Record accessory usage
 */
router.post('/:id/usage', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { usageDate, quantity, purpose } = req.body;

    // Validate required fields
    if (!usageDate) {
      res.status(400).json({ success: false, error: 'Field usageDate is required' });
      return;
    }

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: 'Field quantity must be positive' });
      return;
    }

    const accessory = await AccessoryService.recordUsage(req.user.userId, req.params.id, {
      usageDate: new Date(usageDate),
      quantity: parseInt(quantity, 10),
      purpose: purpose?.trim(),
    });

    res.json({ success: true, data: accessory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record usage';
    let status = 500;
    if (message === 'Accessory not found') status = 404;
    if (message === 'Usage quantity exceeds remaining') status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/accessories/:id/start-using
 * Start using a durable accessory
 */
router.post('/:id/start-using', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const accessory = await AccessoryService.startUsing(req.user.userId, req.params.id);
    res.json({ success: true, data: accessory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start using accessory';
    let status = 500;
    if (message === 'Accessory not found') status = 404;
    if (
      message === 'Only durable accessories can be started' ||
      message === 'Accessory is already in use'
    )
      status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/accessories/:id/stop-using
 * Stop using a durable accessory
 */
router.post('/:id/stop-using', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { purpose } = req.body;
    const accessory = await AccessoryService.stopUsing(
      req.user.userId,
      req.params.id,
      purpose?.trim()
    );
    res.json({ success: true, data: accessory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to stop using accessory';
    let status = 500;
    if (message === 'Accessory not found') status = 404;
    if (message === 'Accessory is not currently in use') status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
