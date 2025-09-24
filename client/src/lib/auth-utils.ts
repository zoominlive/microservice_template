// Authentication utility functions
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
  // Trigger auth changed event
  window.dispatchEvent(new CustomEvent('authChanged', { detail: { token } }));
}

export function clearAuthToken(): void {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  window.dispatchEvent(new CustomEvent('authChanged', { detail: { token: null } }));
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

export function getUserFromToken(): {
  userId: string;
  role: string;
  tenantId: string;
  locations: string[];
  username: string;
} | null {
  const token = getAuthToken();
  if (!token) return null;
  
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  return {
    userId: decoded.userId,
    role: decoded.role,
    tenantId: decoded.tenantId,
    locations: decoded.locations || [],
    username: decoded.username
  };
}

export function hasRole(requiredRoles: string[]): boolean {
  const user = getUserFromToken();
  if (!user) return false;
  
  const userRole = user.role.toLowerCase();
  return requiredRoles.some(role => role.toLowerCase() === userRole);
}

export function hasPermission(resource: string, action: string): boolean {
  const user = getUserFromToken();
  if (!user) return false;
  
  // SuperAdmin has all permissions
  if (user.role.toLowerCase() === 'superadmin') return true;
  
  // Implement your permission logic here based on role
  // This is a simplified version
  const rolePermissions: { [key: string]: string[] } = {
    'admin': ['manage'],
    'director': ['manage', 'approve', 'reject'],
    'assistant_director': ['create', 'read', 'update', 'delete', 'approve'],
    'teacher': ['create', 'read', 'update'],
    'parent': ['read']
  };
  
  const userPermissions = rolePermissions[user.role.toLowerCase()] || [];
  return userPermissions.includes(action) || userPermissions.includes('manage');
}