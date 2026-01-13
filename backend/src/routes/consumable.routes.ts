import { Router, Request, Response } from 'express';
import { ConsumableService } from '../services/consumable.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All consumable routes require authentication
router.use(authMiddleware);

/**
 * GET /api/consumables
 * Get all consumables for the authenticated user with optional filters
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId, typeId, color, colorHex, isOpened } = req.query;

    const filters = {
      brandId: brandId as string | undefined,
      typeId: typeId as string | undefined,
      color: color as string | undefined,
      colorHex: colorHex as string | undefined,
      isOpened: isOpened !== undefined ? isOpened === 'true' : undefined,
    };

    const consumables = await ConsumableService.findAllByUser(req.user.userId, filters);
    res.json({ success: true, data: consumables });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get consumables';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/consumables/batch
 * Batch create consumables
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const {
      brandId,
      typeId,
      color,
      colorHex,
      weight,
      price,
      purchaseDate,
      notes,
      quantity,
      isOpened,
      openedAt,
    } = req.body;

    // Validate required fields
    if (!brandId) {
      res.status(400).json({ success: false, error: 'Field brandId is required' });
      return;
    }
    if (!typeId) {
      res.status(400).json({ success: false, error: 'Field typeId is required' });
      return;
    }
    if (!color || typeof color !== 'string' || color.trim() === '') {
      res.status(400).json({ success: false, error: 'Field color is required' });
      return;
    }
    if (weight === undefined || typeof weight !== 'number' || weight <= 0) {
      res.status(400).json({ success: false, error: 'Weight must be positive' });
      return;
    }
    if (price === undefined || typeof price !== 'number' || price < 0) {
      res.status(400).json({ success: false, error: 'Price must be positive' });
      return;
    }
    if (!purchaseDate) {
      res.status(400).json({ success: false, error: 'Field purchaseDate is required' });
      return;
    }
    if (quantity === undefined || typeof quantity !== 'number' || quantity < 1) {
      res.status(400).json({ success: false, error: 'Quantity must be at least 1' });
      return;
    }

    const result = await ConsumableService.batchCreate(req.user.userId, {
      brandId,
      typeId,
      color: color.trim(),
      colorHex: colorHex?.trim(),
      weight,
      price,
      purchaseDate: new Date(purchaseDate),
      notes: notes?.trim(),
      quantity,
      isOpened: isOpened ?? false,
      openedAt: openedAt ? new Date(openedAt) : undefined,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create consumables';
    let status = 500;
    if (message === 'Brand not found' || message === 'Consumable type not found') status = 404;
    if (message === 'Invalid color format' || message === 'Quantity must be at least 1')
      status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/consumables
 * Create a new consumable
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId, typeId, color, colorHex, weight, price, purchaseDate, notes } = req.body;

    // Validate required fields
    if (!brandId) {
      res.status(400).json({ success: false, error: 'Field brandId is required' });
      return;
    }
    if (!typeId) {
      res.status(400).json({ success: false, error: 'Field typeId is required' });
      return;
    }
    if (!color || typeof color !== 'string' || color.trim() === '') {
      res.status(400).json({ success: false, error: 'Field color is required' });
      return;
    }
    if (weight === undefined || typeof weight !== 'number' || weight <= 0) {
      res.status(400).json({ success: false, error: 'Weight must be positive' });
      return;
    }
    if (price === undefined || typeof price !== 'number' || price < 0) {
      res.status(400).json({ success: false, error: 'Price must be positive' });
      return;
    }
    if (!purchaseDate) {
      res.status(400).json({ success: false, error: 'Field purchaseDate is required' });
      return;
    }

    const consumable = await ConsumableService.create(req.user.userId, {
      brandId,
      typeId,
      color: color.trim(),
      colorHex: colorHex?.trim(),
      weight,
      price,
      purchaseDate: new Date(purchaseDate),
      notes: notes?.trim(),
    });

    res.status(201).json({ success: true, data: consumable });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create consumable';
    let status = 500;
    if (message === 'Brand not found' || message === 'Consumable type not found') status = 404;
    if (message === 'Invalid color format') status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/consumables/:id
 * Get a single consumable by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const consumable = await ConsumableService.findById(req.user.userId, req.params.id);
    res.json({ success: true, data: consumable });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get consumable';
    const status = message === 'Consumable not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/consumables/:id
 * Update a consumable
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const {
      brandId,
      typeId,
      color,
      colorHex,
      weight,
      remainingWeight,
      price,
      purchaseDate,
      notes,
    } = req.body;

    // Validate fields if provided
    if (color !== undefined && (typeof color !== 'string' || color.trim() === '')) {
      res.status(400).json({ success: false, error: 'Field color cannot be empty' });
      return;
    }
    if (weight !== undefined && (typeof weight !== 'number' || weight <= 0)) {
      res.status(400).json({ success: false, error: 'Weight must be positive' });
      return;
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      res.status(400).json({ success: false, error: 'Price must be positive' });
      return;
    }
    if (
      remainingWeight !== undefined &&
      (typeof remainingWeight !== 'number' || remainingWeight < 0)
    ) {
      res.status(400).json({ success: false, error: 'Remaining weight cannot be negative' });
      return;
    }

    const consumable = await ConsumableService.update(req.user.userId, req.params.id, {
      brandId,
      typeId,
      color: color?.trim(),
      colorHex: colorHex?.trim(),
      weight,
      remainingWeight,
      price,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      notes: notes?.trim(),
    });

    res.json({ success: true, data: consumable });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update consumable';
    let status = 500;
    if (
      message === 'Consumable not found' ||
      message === 'Brand not found' ||
      message === 'Consumable type not found'
    ) {
      status = 404;
    }
    if (message === 'Invalid color format') status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/consumables/:id
 * Delete a consumable
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await ConsumableService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Consumable deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete consumable';
    const status = message === 'Consumable not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/consumables/:id/open
 * Mark a consumable as opened
 */
router.patch('/:id/open', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { openedAt } = req.body;

    const consumable = await ConsumableService.markAsOpened(
      req.user.userId,
      req.params.id,
      openedAt ? new Date(openedAt) : undefined
    );

    res.json({ success: true, data: consumable });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark consumable as opened';
    const status = message === 'Consumable not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
