import { Router, Request, Response } from 'express';
import { MaintenanceService, VALID_MAINTENANCE_TYPES } from '../services/maintenance.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All maintenance routes require authentication
router.use(authMiddleware);

/**
 * GET /api/maintenance
 * Get all maintenance records for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const records = await MaintenanceService.findAllByUser(req.user.userId);
    res.json({ success: true, data: records });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get maintenance records';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/maintenance
 * Create a new maintenance record
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { date, type, description } = req.body;

    // Validate required fields
    if (!date) {
      res.status(400).json({ success: false, error: 'Field date is required' });
      return;
    }

    if (!type) {
      res.status(400).json({ success: false, error: 'Field type is required' });
      return;
    }

    // Validate maintenance type
    if (!VALID_MAINTENANCE_TYPES.includes(type)) {
      res.status(400).json({ success: false, error: 'Invalid maintenance type' });
      return;
    }

    const record = await MaintenanceService.create(req.user.userId, {
      date: new Date(date),
      type,
      description: description?.trim(),
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create maintenance record';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/maintenance/:id
 * Get a single maintenance record by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const record = await MaintenanceService.findById(req.user.userId, req.params.id);
    res.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get maintenance record';
    const status = message === 'Record not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/maintenance/:id
 * Update a maintenance record
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { date, type, description } = req.body;

    // Validate maintenance type if provided
    if (type && !VALID_MAINTENANCE_TYPES.includes(type)) {
      res.status(400).json({ success: false, error: 'Invalid maintenance type' });
      return;
    }

    const record = await MaintenanceService.update(req.user.userId, req.params.id, {
      date: date ? new Date(date) : undefined,
      type,
      description: description?.trim(),
    });

    res.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update maintenance record';
    const status = message === 'Record not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/maintenance/:id
 * Delete a maintenance record
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await MaintenanceService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Record deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete maintenance record';
    const status = message === 'Record not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
