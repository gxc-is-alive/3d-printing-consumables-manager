import { Router, Request, Response } from 'express';
import { ConsumableTypeService } from '../services/consumableType.service';
import { TypeMigrationService } from '../services/typeMigration.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All consumable type routes require authentication
router.use(authMiddleware);

// ============ 层级 API ============

/**
 * GET /api/types/hierarchy
 * 获取层级结构（大类和小类）
 */
router.get('/hierarchy', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const hierarchy = await ConsumableTypeService.findAllHierarchy(req.user.userId);
    res.json({ success: true, data: hierarchy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get type hierarchy';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/types/categories
 * 创建大类
 */
router.post('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Category name is required' });
      return;
    }

    const category = await ConsumableTypeService.createCategory(req.user.userId, {
      name: name.trim(),
      description: description?.trim(),
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    const status = message === 'Category name already exists' ? 409 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/types/categories/:id
 * 更新大类
 */
router.put('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ success: false, error: 'Category name cannot be empty' });
      return;
    }

    const category = await ConsumableTypeService.updateCategory(req.user.userId, req.params.id, {
      name: name?.trim(),
      description: description?.trim(),
    });

    res.json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    let status = 500;
    if (message === 'Category not found') status = 404;
    if (message === 'Category name already exists') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/types/categories/:id
 * 删除大类
 */
router.delete('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await ConsumableTypeService.deleteCategory(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Category deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    let status = 500;
    if (message === 'Category not found') status = 404;
    if (message === 'Cannot delete category with subtypes') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /api/types/subtypes
 * 创建小类
 */
router.post('/subtypes', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description, parentId } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Subtype name is required' });
      return;
    }

    if (!parentId || typeof parentId !== 'string') {
      res.status(400).json({ success: false, error: 'Parent category ID is required' });
      return;
    }

    const subtype = await ConsumableTypeService.createSubtype(req.user.userId, {
      name: name.trim(),
      description: description?.trim(),
      parentId,
    });

    res.status(201).json({ success: true, data: subtype });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create subtype';
    let status = 500;
    if (message === 'Target category not found') status = 404;
    if (message === 'Subtype name already exists in this category') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/types/subtypes/:id
 * 更新小类
 */
router.put('/subtypes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, description } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ success: false, error: 'Subtype name cannot be empty' });
      return;
    }

    const subtype = await ConsumableTypeService.updateSubtype(req.user.userId, req.params.id, {
      name: name?.trim(),
      description: description?.trim(),
    });

    res.json({ success: true, data: subtype });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update subtype';
    let status = 500;
    if (message === 'Subtype not found') status = 404;
    if (message === 'Subtype name already exists in this category') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * PUT /api/types/subtypes/:id/move
 * 移动小类到另一个大类
 */
router.put('/subtypes/:id/move', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { parentId } = req.body;

    if (!parentId || typeof parentId !== 'string') {
      res.status(400).json({ success: false, error: 'Target category ID is required' });
      return;
    }

    const subtype = await ConsumableTypeService.moveSubtype(
      req.user.userId,
      req.params.id,
      parentId
    );
    res.json({ success: true, data: subtype });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to move subtype';
    let status = 500;
    if (message === 'Subtype not found' || message === 'Target category not found') status = 404;
    if (message === 'Subtype name already exists in target category') status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/types/subtypes/:id
 * 删除小类
 */
router.delete('/subtypes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await ConsumableTypeService.deleteSubtype(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: 'Subtype deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subtype';
    let status = 500;
    if (message === 'Subtype not found') status = 404;
    if (message.includes('Cannot delete subtype')) status = 409;
    res.status(status).json({ success: false, error: message });
  }
});

// ============ 迁移 API ============

/**
 * GET /api/types/migrate/preview
 * 预览迁移结果
 */
router.get('/migrate/preview', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const preview = await TypeMigrationService.previewMigration(req.user.userId);
    res.json({ success: true, data: preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to preview migration';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/types/migrate
 * 执行数据迁移
 */
router.post('/migrate', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const result = await TypeMigrationService.migrateToHierarchy(req.user.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute migration';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/types/migrate/status
 * 检查是否需要迁移
 */
router.get('/migrate/status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const needsMigration = await TypeMigrationService.needsMigration(req.user.userId);
    res.json({ success: true, data: { needsMigration } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check migration status';
    res.status(500).json({ success: false, error: message });
  }
});

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

    const { name, description } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Field name is required' });
      return;
    }

    const consumableType = await ConsumableTypeService.create(req.user.userId, {
      name: name.trim(),
      description: description?.trim(),
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

    const { name, description } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ success: false, error: 'Field name cannot be empty' });
      return;
    }

    const consumableType = await ConsumableTypeService.update(req.user.userId, req.params.id, {
      name: name?.trim(),
      description: description?.trim(),
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
