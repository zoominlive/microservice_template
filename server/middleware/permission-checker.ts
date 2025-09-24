import { Request, Response, NextFunction } from 'express';

// Type for augmented request with auth info
interface AuthRequest extends Request {
  userId?: string;
  role?: string;
  tenantId?: string;
  permissionCheck?: {
    hasPermission: boolean;
    requiresApproval: boolean;
    reason?: string;
  };
}

export function checkPermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user info from authenticated request
      const authReq = req as AuthRequest;
      const userId = authReq.userId;
      const role = authReq.role;
      const tenantId = authReq.tenantId;
      
      if (!userId || !role) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check if user has permission (simplified for template)
      const hasPermission = await checkUserPermission(
        userId,
        role,
        resource,
        action,
        tenantId || ''
      );

      if (!hasPermission.hasPermission) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: hasPermission.reason || `You don't have permission to ${action} ${resource}`
        });
      }

      // Store permission result for use in route handler
      authReq.permissionCheck = hasPermission;
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

async function checkUserPermission(
  userId: string,
  role: string,
  resource: string,
  action: string,
  tenantId: string
): Promise<{ hasPermission: boolean; requiresApproval: boolean; reason?: string }> {
  // SuperAdmin has all permissions
  if (role.toLowerCase() === 'superadmin') {
    return { hasPermission: true, requiresApproval: false };
  }
  
  const permissionName = `${resource}.${action}`;
  
  // Default permission checking based on role
  const defaultPermissions: { [key: string]: string[] } = {
    'teacher': [
      'resource.create', 'resource.read', 'resource.update',
      'data.read',
      'view.access_main'
    ],
    'assistant_director': [
      'resource.create', 'resource.read', 'resource.update', 'resource.delete',
      'resource.approve', 'resource.reject',
      'data.create', 'data.read', 'data.update',
      'view.access_main', 'view.access_tablet'
    ],
    'director': [
      'resource.manage',
      'data.manage',
      'user.read', 'user.update',
      'view.access_main', 'view.access_tablet'
    ],
    'admin': [
      'resource.manage',
      'data.manage',
      'user.manage',
      'settings.manage',
      'view.access_main', 'view.access_tablet', 'view.access_parent'
    ]
  };
  
  const rolePermissions = defaultPermissions[role.toLowerCase()] || [];
  const hasPermission = rolePermissions.includes(permissionName) || rolePermissions.includes(`${resource}.manage`);
  
  // Check if this action requires approval for this role
  const requiresApproval = false; // Implement approval logic as needed
  
  return {
    hasPermission,
    requiresApproval,
    reason: hasPermission ? undefined : `Role ${role} does not have permission for ${permissionName}`
  };
}

export async function userRequiresApproval(
  permissionName: string,
  userId: string,
  role: string,
  tenantId: string
): Promise<boolean> {
  // Implement approval requirements as needed
  // Example: certain roles might require approval for specific actions
  return false;
}