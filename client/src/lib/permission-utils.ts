import { getUserFromToken } from './auth-utils';

// Permission definitions - customize for your microservice
const PERMISSIONS = {
  // Example permissions - replace with your microservice's permissions
  'dashboard.view': ['admin', 'teacher', 'assistant_teacher', 'director', 'assistant_director'],
  'settings.access': ['admin', 'director', 'assistant_director'],
  'feature1.access': ['admin', 'teacher', 'director', 'assistant_director'],
  'feature2.access': ['admin', 'director'],
  'feature3.access': ['admin'],
  'data.create': ['admin', 'teacher', 'director', 'assistant_director'],
  'data.update': ['admin', 'teacher', 'director', 'assistant_director'],
  'data.delete': ['admin', 'director'],
  'data.approve': ['admin', 'director'],
};

// Permission overrides from the server (tenant-specific)
let permissionOverrides: any[] = [];

export function setPermissionOverrides(overrides: any[]) {
  permissionOverrides = overrides;
  console.log('Permission overrides set:', overrides);
}

export function hasPermission(permission: string): boolean {
  const user = getUserFromToken();
  
  if (!user || !user.role) {
    return false;
  }

  // SuperAdmin has all permissions
  if (user.role === 'SuperAdmin') {
    return true;
  }

  // Check for tenant-specific overrides first
  const override = permissionOverrides.find(o => 
    o.permission === permission && o.active !== false
  );
  
  if (override) {
    // Check if user's role is in the allowed roles
    const allowedRoles = [
      ...(override.rolesRequired || []),
      ...(override.autoApproveRoles || [])
    ];
    return allowedRoles.includes(user.role);
  }

  // Fall back to default permissions
  const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
  if (!allowedRoles) {
    // If permission is not defined, deny by default
    return false;
  }

  return allowedRoles.includes(user.role);
}

export function requiresApproval(permission: string): boolean {
  const user = getUserFromToken();
  
  if (!user || !user.role) {
    return true; // Require approval if no user
  }

  // SuperAdmin never needs approval
  if (user.role === 'SuperAdmin') {
    return false;
  }

  // Check for tenant-specific overrides
  const override = permissionOverrides.find(o => 
    o.permission === permission && o.active !== false
  );
  
  if (override) {
    // Check if user's role auto-approves
    const autoApproveRoles = override.autoApproveRoles || [];
    return !autoApproveRoles.includes(user.role);
  }

  // By default, admins and directors don't need approval
  return !['admin', 'director'].includes(user.role);
}