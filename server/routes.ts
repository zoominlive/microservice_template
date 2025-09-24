import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getStorage } from './storage';
import { insertDataSchema } from '@shared/schema';
import { authenticateToken } from './middleware/auth';
import { checkPermission } from './middleware/permission-checker';
import { getMySQLService } from './services/mysqlService';
import { getPerplexityService } from './services/perplexityService';
import { getClaudeService } from './services/claudeService';
import { getOpenAIService } from './services/openaiService';
import { getS3Service } from './services/s3Service';
import multer from 'multer';

const router = Router();
const storage = getStorage();
const s3Service = getS3Service();

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Augmented request type with auth info
interface AuthRequest extends Request {
  userId?: string;
  role?: string;
  tenantId?: string;
  locations?: string[];
}

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get locations from MySQL (parent app)
router.get('/locations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const mysqlService = getMySQLService();
    const locations = await mysqlService.getLocations(tenantId);
    
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get rooms from MySQL
router.get('/rooms', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.tenantId;
    const locationId = req.query.locationId as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const mysqlService = getMySQLService();
    const rooms = await mysqlService.getRooms(tenantId, locationId);
    
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get tags from MySQL
router.get('/tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const mysqlService = getMySQLService();
    const tags = await mysqlService.getTags(tenantId);
    
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// CRUD operations for data
router.get('/data', 
  authenticateToken,
  checkPermission('data', 'read'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      
      const filters = {
        status: req.query.status as string,
        type: req.query.type as string,
      };
      
      const data = await storage.getAllData({
        tenantId,
        status: filters.status,
        locationId: undefined,
      });
      res.json(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  }
);

router.get('/data/:id',
  authenticateToken,
  checkPermission('data', 'read'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const { id } = req.params;
      
      const data = await storage.getData(id, tenantId);
      
      if (!data) {
        return res.status(404).json({ error: 'Data not found' });
      }
      
      res.json(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  }
);

router.post('/data',
  authenticateToken,
  checkPermission('data', 'create'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const userId = authReq.userId!;
      
      // Validate request body
      const validatedData = insertDataSchema.parse({
        ...req.body,
        tenantId,
        userId,
      });
      
      const data = await storage.createData(validatedData);
      res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      console.error('Error creating data:', error);
      res.status(500).json({ error: 'Failed to create data' });
    }
  }
);

router.put('/data/:id',
  authenticateToken,
  checkPermission('data', 'update'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const { id } = req.params;
      
      // Remove fields that shouldn't be updated
      const { id: _id, tenantId: _tenantId, ...updates } = req.body;
      
      const data = await storage.updateData(id, tenantId, updates);
      
      if (!data) {
        return res.status(404).json({ error: 'Data not found' });
      }
      
      res.json(data);
    } catch (error) {
      console.error('Error updating data:', error);
      res.status(500).json({ error: 'Failed to update data' });
    }
  }
);

router.delete('/data/:id',
  authenticateToken,
  checkPermission('data', 'delete'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const { id } = req.params;
      
      await storage.deleteData(id, tenantId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting data:', error);
      res.status(500).json({ error: 'Failed to delete data' });
    }
  }
);

// AI endpoints (examples)
router.post('/ai/generate',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { prompt, service = 'openai' } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt required' });
      }
      
      let content: string;
      
      switch (service) {
        case 'claude':
          const claudeService = getClaudeService();
          content = await claudeService.generateContent(prompt);
          break;
        case 'perplexity':
          const perplexityService = getPerplexityService();
          content = await perplexityService.generateContent(prompt);
          break;
        case 'openai':
        default:
          const openAIService = getOpenAIService();
          content = await openAIService.generateContent(prompt);
          break;
      }
      
      res.json({ content });
    } catch (error) {
      console.error('AI generation error:', error);
      res.status(500).json({ error: 'AI generation failed' });
    }
  }
);

// ============================================
// S3 FILE STORAGE ENDPOINTS
// ============================================

// Upload file to S3
router.post('/storage/upload',
  authenticateToken,
  checkPermission('storage', 'create'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      // Get type and entityId from request body or query
      const type = req.body.type || req.query.type || 'document';
      const entityId = req.body.entityId || req.query.entityId;
      const metadata = req.body.metadata || {};
      
      const result = await s3Service.upload({
        tenantId,
        type: type as string,
        originalName: req.file.originalname,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
        id: entityId,
        metadata,
      });
      
      if (!result.success) {
        if (result.error?.includes('not configured')) {
          return res.status(503).json({ error: 'Storage service not available' });
        }
        return res.status(500).json({ error: result.error || 'Upload failed' });
      }
      
      // Create audit log
      await storage.createAuditLog({
        tenantId,
        userId: authReq.userId!,
        userRole: authReq.role,
        action: 'CREATE',
        resource: 'storage',
        resourceId: result.key,
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          type,
          entityId,
        },
      });
      
      res.json({
        success: true,
        key: result.key,
        url: result.url,
        fileName: result.fileName,
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// Get signed URL for direct upload/download
router.post('/storage/signed-url',
  authenticateToken,
  checkPermission('storage', 'read'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      
      const { key, operation = 'get', expiresIn = 3600, contentType } = req.body;
      
      if (!key) {
        return res.status(400).json({ error: 'Key is required' });
      }
      
      // Verify the key belongs to this tenant
      if (!key.includes(`/${tenantId}/`)) {
        return res.status(403).json({ error: 'Access denied to this resource' });
      }
      
      const url = await s3Service.getSignedUrl({
        key,
        operation: operation as 'get' | 'put',
        expiresIn,
        contentType,
      });
      
      if (!url) {
        return res.status(503).json({ error: 'Storage service not available' });
      }
      
      res.json({ url, expiresIn });
    } catch (error) {
      console.error('Signed URL generation error:', error);
      res.status(500).json({ error: 'Failed to generate signed URL' });
    }
  }
);

// Download file from S3
router.get('/storage/download/:key(*)',
  authenticateToken,
  checkPermission('storage', 'read'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const key = req.params.key;
      
      // Verify the key belongs to this tenant
      if (!key.includes(`/${tenantId}/`)) {
        return res.status(403).json({ error: 'Access denied to this resource' });
      }
      
      await s3Service.download(key, res);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ error: 'File download failed' });
    }
  }
);

// List files in S3
router.get('/storage/list',
  authenticateToken,
  checkPermission('storage', 'read'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const type = req.query.type as string | undefined;
      const maxKeys = parseInt(req.query.maxKeys as string) || 1000;
      
      const result = await s3Service.list(tenantId, type, maxKeys);
      
      if (!result.success) {
        if (result.error?.includes('not configured')) {
          return res.status(503).json({ error: 'Storage service not available' });
        }
        return res.status(500).json({ error: result.error || 'List failed' });
      }
      
      res.json({
        success: true,
        files: result.keys,
        count: result.keys?.length || 0,
      });
    } catch (error) {
      console.error('File listing error:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  }
);

// Delete file from S3
router.delete('/storage/delete/:key(*)',
  authenticateToken,
  checkPermission('storage', 'delete'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const key = req.params.key;
      
      // Verify the key belongs to this tenant
      if (!key.includes(`/${tenantId}/`)) {
        return res.status(403).json({ error: 'Access denied to this resource' });
      }
      
      const result = await s3Service.delete(key);
      
      if (!result.success) {
        if (result.error?.includes('not configured')) {
          return res.status(503).json({ error: 'Storage service not available' });
        }
        return res.status(500).json({ error: result.error || 'Delete failed' });
      }
      
      // Create audit log
      await storage.createAuditLog({
        tenantId,
        userId: authReq.userId!,
        userRole: authReq.role,
        action: 'DELETE',
        resource: 'storage',
        resourceId: key,
      });
      
      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('File deletion error:', error);
      res.status(500).json({ error: 'File deletion failed' });
    }
  }
);

// Check if file exists
router.head('/storage/exists/:key(*)',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const tenantId = authReq.tenantId!;
      const key = req.params.key;
      
      // Verify the key belongs to this tenant
      if (!key.includes(`/${tenantId}/`)) {
        return res.status(403).send();
      }
      
      const exists = await s3Service.exists(key);
      
      if (exists) {
        res.status(200).send();
      } else {
        res.status(404).send();
      }
    } catch (error) {
      console.error('File existence check error:', error);
      res.status(500).send();
    }
  }
);

export default router;