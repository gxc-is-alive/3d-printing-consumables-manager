import { Router, Request, Response } from 'express';
import multer from 'multer';
import { BrandConfigFileService } from '../services/brandConfigFile.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 配置 multer - 使用内存存储，限制文件大小为 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/brands/:brandId/files
 * Upload configuration files for a brand (supports multiple files)
 */
router.post(
  '/brands/:brandId/files',
  upload.array('files', 10), // 最多同时上传 10 个文件
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: 'No files uploaded' });
        return;
      }

      const { brandId } = req.params;
      const uploadedFiles = [];

      for (const file of files) {
        const result = await BrandConfigFileService.upload(req.user.userId, brandId, {
          originalname: file.originalname,
          size: file.size,
          buffer: file.buffer,
        });
        uploadedFiles.push(result);
      }

      res.status(201).json({ success: true, data: uploadedFiles });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload files';
      const status = message === 'Brand not found' ? 404 : 500;
      res.status(status).json({ success: false, error: message });
    }
  }
);

/**
 * GET /api/brands/:brandId/files
 * Get all configuration files for a brand
 */
router.get('/brands/:brandId/files', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { brandId } = req.params;
    const files = await BrandConfigFileService.findByBrand(req.user.userId, brandId);

    res.json({ success: true, data: files });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get files';
    const status = message === 'Brand not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /api/brand-files/:fileId/download
 * Download a configuration file
 */
router.get('/brand-files/:fileId/download', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { fileId } = req.params;
    const { path: filePath, fileName } = await BrandConfigFileService.getFilePath(
      req.user.userId,
      fileId
    );

    res.download(filePath, fileName);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to download file';
    let status = 500;
    if (message === 'File not found' || message === 'File not found on disk') {
      status = 404;
    }
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/brand-files/:fileId
 * Delete a configuration file
 */
router.delete('/brand-files/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { fileId } = req.params;
    await BrandConfigFileService.delete(req.user.userId, fileId);

    res.json({ success: true, data: { message: 'File deleted successfully' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete file';
    const status = message === 'File not found' ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
