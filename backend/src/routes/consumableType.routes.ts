import { Router, Request, Response } from 'express';
import { ConsumableTypeService } from '../services/consumableType.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All consumable type routes require authentication
router.use(authMiddleware);

/**
 * GET /api/types
 * Get all consumable types for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const types = await ConsumableTypeService.findAllByUser(req.user.userId);
    res.json({ success: true, data: types });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get consumable types';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/types
 * Create a new consumable type
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description, printTempMin, printTempMax, bedTempMin, bedTempMax } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Field name is required' });
      return;
    }

    // Validate temperature fields if provided
    if (printTempMin !== undefined && (typeof printTempMin !== 'number' || printTempMin < 0)) {
      res.status(400).json({ success: false, error: 'printTempMin must be a positive number' });
      return;
    }
    if (printTempMax !== undefined && (typeof printTempMax !== 'number' || printTempMax < 0)) {
      res.status(400).json({ success: false, error: 'printTempMax must be a positive number' });
      return;
    }
    if (bedTempMin !== undefined && (typeof bedTempMin !== 'number' || bedTempMin < 0)) {
      res.status(400).json({ success: false, error: 'bedTempMin must be a positive number' });
      return;
    }
    if (bedTempMax !== undefined && (typeof bedTempMax !== 'number' || bedTempMax < 0)) {
      res.status(400).json({ success: false, error: 'bedTempMax must be a positive number' });
      return;
    }

    const consumableType = await ConsumableTypeService.create(req.user.userId, {
      name: name.trim(),
      description: description?.trim(),
      printTempMin,
      printTempMax,
      bedTempMin,
      bedTempMax,
    });

    res.status(201).json({ success: true, data: consumableType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create consumable type';
    const status = message === 'Consumable type name already exists' ? 409 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/types/:id
 * Get a single consumable type by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const consumableType = await ConsumableTypeService.findById(req.user.userId, req.params.id);
    res.json({ success: true, data: consumableType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get consumable type';
    const status = message === 'Consumable type not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/types/:id
 * Update a consumable type
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description, printTempMin, printTempMax, bedTempMin, bedTempMax } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ success: false, error: 'Field name cannot be empty' });
      return;
    }

    // Validate temperature fields if provided
    if (printTempMin !== undefined && (typeof printTempMin !== 'number' || printTempMin < 0)) {
      res.status(400).json({ success: false, error: 'printTempMin must be a positive number' });
      return;
    }
    if (printTempMax !== undefined && (typeof printTempMax !== 'number' || printTempMax < 0)) {
      res.status(400).json({ success: false, error: 'printTempMax must be a positive number' });
      return;
    }
    if (bedTempMin !== undefined && (typeof bedTempMin !== 'number' || bedTempMin < 0)) {
      res.status(400).json({ success: false, error: 'bedTempMin must be a positive number' });
      return;
    }
    if (bedTempMax !== undefined && (typeof bedTempMax !== 'number' || bedTempMax < 0)) {
      res.status(400).json({ success: false, error: 'bedTempMax must be a positive number' });
      return;
    }

    const consumableType = await ConsumableTypeService.update(req.user.userId, req.params.id, {
      name: name?.trim(),
      description: description?.trim(),
      printTempMin,
      printTempMax,
      bedTempMin,
      bedTempMax,
    });

    res.json({ success: true, data: consumableType });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update consumable type';
    let status = 500;
    if (message === 'Consumable type not found') status = 404;
    if (message === 'Consumable type name already exists') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/types/:id
 * Delete a consumable type
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await ConsumableTypeService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Consumable type deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete consumable type';
    let status = 500;
    if (message === 'Consumable type not found') status = 404;
    if (message === 'Cannot delete type with existing consumables') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
