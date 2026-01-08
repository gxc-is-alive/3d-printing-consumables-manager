import { Router, Request, Response } from 'express';
import { UsageRecordService } from '../services/usageRecord.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All usage record routes require authentication
router.use(authMiddleware);

/**
 * GET /api/usages
 * Get all usage records for the authenticated user with optional filters
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { consumableId, startDate, endDate } = req.query;

    const filters = {
      consumableId: consumableId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const records = await UsageRecordService.findAllByUser(req.user.userId, filters);
    res.json({ success: true, data: records });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get usage records';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/usages
 * Create a new usage record
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { consumableId, amountUsed, usageDate, projectName, notes } = req.body;

    // Validate required fields
    if (!consumableId) {
      res.status(400).json({ success: false, error: 'Field consumableId is required' });
      return;
    }
    if (amountUsed === undefined || typeof amountUsed !== 'number' || amountUsed <= 0) {
      res.status(400).json({ success: false, error: 'Amount used must be positive' });
      return;
    }
    if (!usageDate) {
      res.status(400).json({ success: false, error: 'Field usageDate is required' });
      return;
    }

    const result = await UsageRecordService.create(req.user.userId, {
      consumableId,
      amountUsed,
      usageDate: new Date(usageDate),
      projectName: projectName?.trim(),
      notes: notes?.trim(),
    });

    res.status(201).json({
      success: true,
      data: result.record,
      warning: result.warning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create usage record';
    let status = 500;
    if (message === 'Consumable not found') status = 404;
    if (message === 'Amount used must be positive') status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/usages/:id
 * Get a single usage record by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const record = await UsageRecordService.findById(req.user.userId, req.params.id);
    res.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get usage record';
    const status = message === 'Usage record not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/usages/:id
 * Update a usage record
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { amountUsed, usageDate, projectName, notes } = req.body;

    // Validate amountUsed if provided
    if (amountUsed !== undefined && (typeof amountUsed !== 'number' || amountUsed <= 0)) {
      res.status(400).json({ success: false, error: 'Amount used must be positive' });
      return;
    }

    const result = await UsageRecordService.update(req.user.userId, req.params.id, {
      amountUsed,
      usageDate: usageDate ? new Date(usageDate) : undefined,
      projectName: projectName?.trim(),
      notes: notes?.trim(),
    });

    res.json({
      success: true,
      data: result.record,
      warning: result.warning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update usage record';
    let status = 500;
    if (message === 'Usage record not found') status = 404;
    if (message === 'Amount used must be positive') status = 400;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/usages/:id
 * Delete a usage record and restore inventory
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await UsageRecordService.delete(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Usage record deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete usage record';
    const status = message === 'Usage record not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
