import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All dashboard routes require authentication
router.use(authMiddleware);

/**
 * GET /api/dashboard/inventory
 * Get inventory overview grouped by brand, type, and color
 * Requirements: 7.1, 7.3
 */
router.get('/inventory', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const inventory = await DashboardService.getInventoryOverview(req.user.userId);
    res.json({ success: true, data: inventory });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get inventory overview';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/dashboard/stats
 * Get inventory statistics including totals and low stock alerts
 * Requirements: 4.5, 7.3, 7.4
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    // Optional threshold parameter (default 0.2 = 20%)
    const thresholdParam = req.query.threshold;
    let threshold: number | undefined;
    if (thresholdParam !== undefined) {
      threshold = parseFloat(thresholdParam as string);
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        res.status(400).json({
          success: false,
          error: 'Threshold must be a number between 0 and 1',
        });
        return;
      }
    }

    const stats = await DashboardService.getStats(req.user.userId, threshold);
    res.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
