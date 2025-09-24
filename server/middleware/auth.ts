import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  tenantId: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  username: string;
  role: string;
  locations: string[];
  iat?: number;
  exp?: number;
}

interface AuthRequest extends Request {
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  username?: string;
  role?: string;
  locations?: string[];
  tenantId?: string;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Attach user info to request
    const authReq = req as AuthRequest;
    authReq.userId = decoded.userId;
    authReq.userFirstName = decoded.userFirstName;
    authReq.userLastName = decoded.userLastName;
    authReq.username = decoded.username;
    authReq.role = decoded.role;
    authReq.locations = decoded.locations;
    authReq.tenantId = decoded.tenantId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const userRole = authReq.role;

    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const normalizedUserRole = userRole.toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());

    if (!normalizedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Attach user info to request
    const authReq = req as AuthRequest;
    authReq.userId = decoded.userId;
    authReq.userFirstName = decoded.userFirstName;
    authReq.userLastName = decoded.userLastName;
    authReq.username = decoded.username;
    authReq.role = decoded.role;
    authReq.locations = decoded.locations;
    authReq.tenantId = decoded.tenantId;
  } catch (error) {
    // Token is invalid, but continue without auth
    console.warn('Optional auth token invalid:', error);
  }

  next();
}