import jwt from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'test-secret-key-for-testing-only';

/**
 * JWT payload structure matching the application's auth system
 */
export interface TestJWTPayload {
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

/**
 * Create a valid JWT token for testing
 * 
 * @param payload - Custom payload data (partial overrides allowed)
 * @param options - JWT sign options
 * @returns Signed JWT token string
 */
export const createTestJWT = (
  payload?: Partial<TestJWTPayload>,
  options?: jwt.SignOptions
): string => {
  const defaultPayload: TestJWTPayload = {
    tenantId: 'test_tenant',
    userId: 'test-user-123',
    userFirstName: 'Test',
    userLastName: 'User',
    username: 'testuser@example.com',
    role: 'Teacher',
    locations: ['Main Location'],
    iat: Math.floor(Date.now() / 1000),
    ...payload
  };

  // Add expiration if not specified (1 hour default)
  if (!defaultPayload.exp && !options?.expiresIn) {
    defaultPayload.exp = Math.floor(Date.now() / 1000) + 3600;
  }

  return jwt.sign(defaultPayload, TEST_JWT_SECRET, {
    algorithm: 'HS256',
    ...options
  });
};

/**
 * Create an expired JWT token for testing auth failures
 */
export const createExpiredJWT = (payload?: Partial<TestJWTPayload>): string => {
  return createTestJWT({
    ...payload,
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago
  });
};

/**
 * Create authentication headers for testing
 */
export const createAuthHeaders = (
  token?: string | Partial<TestJWTPayload>
): Record<string, string> => {
  let jwtToken: string;

  if (typeof token === 'string') {
    jwtToken = token;
  } else {
    jwtToken = createTestJWT(token);
  }

  return {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Create role-specific headers for testing
 */
export const createRoleHeaders = {
  admin: (overrides?: Partial<TestJWTPayload>) => createAuthHeaders({
    role: 'Admin',
    locations: ['All Locations'],
    ...overrides
  }),
  
  superAdmin: (overrides?: Partial<TestJWTPayload>) => createAuthHeaders({
    role: 'SuperAdmin',
    locations: ['All Locations'],
    ...overrides
  }),
  
  teacher: (overrides?: Partial<TestJWTPayload>) => createAuthHeaders({
    role: 'Teacher',
    locations: ['Main Campus'],
    ...overrides
  }),
  
  director: (overrides?: Partial<TestJWTPayload>) => createAuthHeaders({
    role: 'Director',
    locations: ['Main Campus', 'North Branch'],
    ...overrides
  }),
  
  parent: (overrides?: Partial<TestJWTPayload>) => createAuthHeaders({
    role: 'Parent',
    locations: ['Main Campus'],
    ...overrides
  })
};