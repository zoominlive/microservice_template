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

const router = Router();
const storage = getStorage();

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
      
      const data = await storage.listData(tenantId, filters);
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
      
      const deleted = await storage.deleteData(id, tenantId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Data not found' });
      }
      
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

export default router;