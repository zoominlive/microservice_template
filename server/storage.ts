import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, asc, or, ilike, sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

// Storage interface for multi-tenant microservice with RBAC support
export interface IStorage {
  // ============================================
  // USER CACHE OPERATIONS
  // ============================================
  
  // Update or insert user info from JWT token
  upsertUserCache(user: schema.InsertUserCache): Promise<schema.UserCache>;
  
  // Get cached user info
  getUserFromCache(userId: string): Promise<schema.UserCache | null>;
  
  // ============================================
  // PERMISSION OVERRIDE OPERATIONS
  // ============================================
  
  // Get all permission overrides for a tenant
  getPermissionOverrides(tenantId: string): Promise<schema.PermissionOverride[]>;
  
  // Get specific permission override
  getPermissionOverride(tenantId: string, permission: string): Promise<schema.PermissionOverride | null>;
  
  // Create or update permission override
  upsertPermissionOverride(override: schema.InsertPermissionOverride): Promise<schema.PermissionOverride>;
  
  // Delete permission override
  deletePermissionOverride(id: string, tenantId: string): Promise<void>;
  
  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================
  
  // Create audit log entry
  createAuditLog(log: schema.InsertAuditLog): Promise<schema.AuditLog>;
  
  // Get audit logs for tenant with filters
  getAuditLogs(params: {
    tenantId: string;
    userId?: string;
    resource?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: schema.AuditLog[]; total: number }>;
  
  // ============================================
  // BUSINESS DATA OPERATIONS
  // Replace these with your actual business entity operations
  // ============================================
  
  // Get all data for a tenant (with optional filters)
  getAllData(params: {
    tenantId: string;
    userId?: string;
    status?: string;
    locationId?: string;
  }): Promise<schema.Data[]>;
  
  // Get single data item (ensures tenant access)
  getData(id: string, tenantId: string): Promise<schema.Data | null>;
  
  // Create new data
  createData(data: schema.InsertData): Promise<schema.Data>;
  
  // Update existing data
  updateData(id: string, tenantId: string, updates: Partial<schema.InsertData>): Promise<schema.Data>;
  
  // Delete data (soft delete recommended)
  deleteData(id: string, tenantId: string): Promise<void>;
  
  // Approve data (if using approval workflow)
  approveData(id: string, tenantId: string, approverId: string): Promise<schema.Data>;
}

// ==============================================
// IN-MEMORY IMPLEMENTATION (FOR DEVELOPMENT)
// ==============================================

export class MemStorage implements IStorage {
  private userCache: Map<string, schema.UserCache> = new Map();
  private permissionOverrides: Map<string, schema.PermissionOverride> = new Map();
  private auditLogs: schema.AuditLog[] = [];
  private data: Map<string, schema.Data> = new Map();
  
  // User cache
  async upsertUserCache(user: schema.InsertUserCache): Promise<schema.UserCache> {
    const cached: schema.UserCache = {
      ...user,
      lastSeen: new Date(),
      createdAt: this.userCache.get(user.id)?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.userCache.set(user.id, cached);
    return cached;
  }
  
  async getUserFromCache(userId: string): Promise<schema.UserCache | null> {
    return this.userCache.get(userId) || null;
  }
  
  // Permission overrides
  async getPermissionOverrides(tenantId: string): Promise<schema.PermissionOverride[]> {
    return Array.from(this.permissionOverrides.values()).filter(
      (p) => p.tenantId === tenantId && p.active
    );
  }
  
  async getPermissionOverride(tenantId: string, permission: string): Promise<schema.PermissionOverride | null> {
    return Array.from(this.permissionOverrides.values()).find(
      (p) => p.tenantId === tenantId && p.permission === permission && p.active
    ) || null;
  }
  
  async upsertPermissionOverride(override: schema.InsertPermissionOverride): Promise<schema.PermissionOverride> {
    const id = crypto.randomUUID();
    const key = `${override.tenantId}-${override.permission}`;
    const existing = Array.from(this.permissionOverrides.values()).find(
      (p) => p.tenantId === override.tenantId && p.permission === override.permission
    );
    
    const saved: schema.PermissionOverride = {
      id: existing?.id || id,
      ...override,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.permissionOverrides.set(key, saved);
    return saved;
  }
  
  async deletePermissionOverride(id: string, tenantId: string): Promise<void> {
    for (const [key, value] of this.permissionOverrides.entries()) {
      if (value.id === id && value.tenantId === tenantId) {
        this.permissionOverrides.delete(key);
        break;
      }
    }
  }
  
  // Audit logs
  async createAuditLog(log: schema.InsertAuditLog): Promise<schema.AuditLog> {
    const auditLog: schema.AuditLog = {
      id: crypto.randomUUID(),
      ...log,
      timestamp: new Date(),
    };
    this.auditLogs.push(auditLog);
    return auditLog;
  }
  
  async getAuditLogs(params: {
    tenantId: string;
    userId?: string;
    resource?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: schema.AuditLog[]; total: number }> {
    let filtered = this.auditLogs.filter((log) => log.tenantId === params.tenantId);
    
    if (params.userId) {
      filtered = filtered.filter((log) => log.userId === params.userId);
    }
    if (params.resource) {
      filtered = filtered.filter((log) => log.resource === params.resource);
    }
    if (params.action) {
      filtered = filtered.filter((log) => log.action === params.action);
    }
    
    const total = filtered.length;
    const start = params.offset || 0;
    const end = start + (params.limit || 50);
    
    return {
      logs: filtered.slice(start, end),
      total,
    };
  }
  
  // Business data operations
  async getAllData(params: {
    tenantId: string;
    userId?: string;
    status?: string;
    locationId?: string;
  }): Promise<schema.Data[]> {
    let results = Array.from(this.data.values()).filter(
      (item) => item.tenantId === params.tenantId
    );
    
    if (params.userId) {
      results = results.filter((item) => item.userId === params.userId);
    }
    if (params.status) {
      results = results.filter((item) => item.status === params.status);
    }
    if (params.locationId) {
      results = results.filter((item) => 
        item.locationId === params.locationId ||
        item.locationIds?.includes(params.locationId)
      );
    }
    
    return results;
  }
  
  async getData(id: string, tenantId: string): Promise<schema.Data | null> {
    const item = this.data.get(id);
    if (!item || item.tenantId !== tenantId) {
      return null;
    }
    return item;
  }
  
  async createData(data: schema.InsertData): Promise<schema.Data> {
    const item: schema.Data = {
      id: crypto.randomUUID(),
      ...data,
      status: data.status || "draft",
      requiresApproval: data.requiresApproval || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedBy: null,
      approvedAt: null,
    };
    this.data.set(item.id, item);
    return item;
  }
  
  async updateData(id: string, tenantId: string, updates: Partial<schema.InsertData>): Promise<schema.Data> {
    const existing = await this.getData(id, tenantId);
    if (!existing) {
      throw new Error("Data not found");
    }
    
    const updated: schema.Data = {
      ...existing,
      ...updates,
      id: existing.id,
      tenantId: existing.tenantId, // Can't change tenant
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    
    this.data.set(id, updated);
    return updated;
  }
  
  async deleteData(id: string, tenantId: string): Promise<void> {
    const existing = await this.getData(id, tenantId);
    if (existing) {
      this.data.delete(id);
    }
  }
  
  async approveData(id: string, tenantId: string, approverId: string): Promise<schema.Data> {
    const existing = await this.getData(id, tenantId);
    if (!existing) {
      throw new Error("Data not found");
    }
    
    const approved: schema.Data = {
      ...existing,
      status: "approved",
      approvedBy: approverId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.data.set(id, approved);
    return approved;
  }
}

// ==============================================
// POSTGRESQL DATABASE IMPLEMENTATION
// ==============================================

export class DatabaseStorage implements IStorage {
  private db: any;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const sql = postgres(connectionString);
    this.db = drizzle(sql, { schema });
  }

  // User cache operations
  async upsertUserCache(user: schema.InsertUserCache): Promise<schema.UserCache> {
    const results = await this.db
      .insert(schema.userCache)
      .values({
        ...user,
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.userCache.id,
        set: {
          ...user,
          lastSeen: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return results[0];
  }
  
  async getUserFromCache(userId: string): Promise<schema.UserCache | null> {
    const results = await this.db
      .select()
      .from(schema.userCache)
      .where(eq(schema.userCache.id, userId))
      .limit(1);
    
    return results[0] || null;
  }
  
  // Permission override operations
  async getPermissionOverrides(tenantId: string): Promise<schema.PermissionOverride[]> {
    return this.db
      .select()
      .from(schema.tenantPermissionOverrides)
      .where(and(
        eq(schema.tenantPermissionOverrides.tenantId, tenantId),
        eq(schema.tenantPermissionOverrides.active, true)
      ));
  }
  
  async getPermissionOverride(tenantId: string, permission: string): Promise<schema.PermissionOverride | null> {
    const results = await this.db
      .select()
      .from(schema.tenantPermissionOverrides)
      .where(and(
        eq(schema.tenantPermissionOverrides.tenantId, tenantId),
        eq(schema.tenantPermissionOverrides.permission, permission),
        eq(schema.tenantPermissionOverrides.active, true)
      ))
      .limit(1);
    
    return results[0] || null;
  }
  
  async upsertPermissionOverride(override: schema.InsertPermissionOverride): Promise<schema.PermissionOverride> {
    // First, check if one exists
    const existing = await this.getPermissionOverride(override.tenantId, override.permission);
    
    if (existing) {
      const results = await this.db
        .update(schema.tenantPermissionOverrides)
        .set({
          ...override,
          updatedAt: new Date(),
        })
        .where(eq(schema.tenantPermissionOverrides.id, existing.id))
        .returning();
      return results[0];
    } else {
      const results = await this.db
        .insert(schema.tenantPermissionOverrides)
        .values(override)
        .returning();
      return results[0];
    }
  }
  
  async deletePermissionOverride(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(schema.tenantPermissionOverrides)
      .where(and(
        eq(schema.tenantPermissionOverrides.id, id),
        eq(schema.tenantPermissionOverrides.tenantId, tenantId)
      ));
  }
  
  // Audit log operations
  async createAuditLog(log: schema.InsertAuditLog): Promise<schema.AuditLog> {
    const results = await this.db
      .insert(schema.auditLogs)
      .values(log)
      .returning();
    
    return results[0];
  }
  
  async getAuditLogs(params: {
    tenantId: string;
    userId?: string;
    resource?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: schema.AuditLog[]; total: number }> {
    let query = this.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.tenantId, params.tenantId));
    
    if (params.userId) {
      query = query.where(eq(schema.auditLogs.userId, params.userId));
    }
    if (params.resource) {
      query = query.where(eq(schema.auditLogs.resource, params.resource));
    }
    if (params.action) {
      query = query.where(eq(schema.auditLogs.action, params.action));
    }
    
    // Get total count
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(query.as('subquery'));
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated results
    const logs = await query
      .orderBy(desc(schema.auditLogs.timestamp))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
    
    return { logs, total };
  }
  
  // Business data operations
  async getAllData(params: {
    tenantId: string;
    userId?: string;
    status?: string;
    locationId?: string;
  }): Promise<schema.Data[]> {
    let query = this.db
      .select()
      .from(schema.data)
      .where(eq(schema.data.tenantId, params.tenantId));
    
    if (params.userId) {
      query = query.where(eq(schema.data.userId, params.userId));
    }
    if (params.status) {
      query = query.where(eq(schema.data.status, params.status));
    }
    if (params.locationId) {
      // Check both locationId and locationIds array
      query = query.where(or(
        eq(schema.data.locationId, params.locationId),
        sql`${schema.data.locationIds} @> ${[params.locationId]}::jsonb`
      ));
    }
    
    return query.orderBy(desc(schema.data.createdAt));
  }
  
  async getData(id: string, tenantId: string): Promise<schema.Data | null> {
    const results = await this.db
      .select()
      .from(schema.data)
      .where(and(
        eq(schema.data.id, id),
        eq(schema.data.tenantId, tenantId)
      ))
      .limit(1);
    
    return results[0] || null;
  }
  
  async createData(data: schema.InsertData): Promise<schema.Data> {
    const results = await this.db
      .insert(schema.data)
      .values(data)
      .returning();
    
    return results[0];
  }
  
  async updateData(id: string, tenantId: string, updates: Partial<schema.InsertData>): Promise<schema.Data> {
    const results = await this.db
      .update(schema.data)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(schema.data.id, id),
        eq(schema.data.tenantId, tenantId)
      ))
      .returning();
    
    if (!results[0]) {
      throw new Error("Data not found");
    }
    
    return results[0];
  }
  
  async deleteData(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(schema.data)
      .where(and(
        eq(schema.data.id, id),
        eq(schema.data.tenantId, tenantId)
      ));
  }
  
  async approveData(id: string, tenantId: string, approverId: string): Promise<schema.Data> {
    const results = await this.db
      .update(schema.data)
      .set({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.data.id, id),
        eq(schema.data.tenantId, tenantId)
      ))
      .returning();
    
    if (!results[0]) {
      throw new Error("Data not found");
    }
    
    return results[0];
  }
}

// Storage factory
let storage: IStorage;

export function getStorage(): IStorage {
  if (!storage) {
    const dbType = process.env.DB_TYPE || 'memory';
    
    if (dbType === 'pg' || dbType === 'postgres') {
      storage = new DatabaseStorage();
    } else {
      storage = new MemStorage();
    }
    
    console.log(`Using ${dbType} storage`);
  }
  
  return storage;
}