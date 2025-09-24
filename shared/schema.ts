import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// MULTI-TENANCY & AUTH SUPPORT TABLES
// ============================================

// User cache - stores basic info from JWT tokens for reference
// The parent app handles actual authentication
export const userCache = pgTable("user_cache", {
  id: uuid("id").primaryKey(), // This matches userId from JWT
  tenantId: text("tenant_id").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull(),
  locations: jsonb("locations").$type<string[]>().default([]),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant-specific permission overrides
// Allows organizations to customize permissions per role
export const tenantPermissionOverrides = pgTable("tenant_permission_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  permission: text("permission").notNull(), // e.g., "resource.create"
  rolesRequired: jsonb("roles_required").$type<string[]>().default([]), // Roles that need approval
  autoApproveRoles: jsonb("auto_approve_roles").$type<string[]>().default([]), // Roles that bypass approval
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs for tracking all actions
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  userRole: text("user_role"),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, etc.
  resource: text("resource").notNull(), // What type of resource
  resourceId: text("resource_id"), // ID of the affected resource
  changes: jsonb("changes"), // What changed (before/after)
  metadata: jsonb("metadata"), // Additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ============================================
// YOUR MICROSERVICE BUSINESS DATA
// ============================================

// Example: Generic data table - REPLACE WITH YOUR ACTUAL BUSINESS ENTITIES
// IMPORTANT: Always include tenantId for multi-tenant isolation
export const data = pgTable("data", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(), // CRITICAL: Always include this
  userId: uuid("user_id").notNull(), // Who created/owns it
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"),
  status: text("status").default("draft"),
  content: jsonb("content"),
  metadata: jsonb("metadata"),
  
  // Location-based access control (optional)
  locationId: text("location_id"), // Restrict to specific location
  locationIds: jsonb("location_ids").$type<string[]>(), // Or multiple locations
  
  // Approval workflow fields (if needed)
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// TYPE EXPORTS
// ============================================

// User cache types
export const insertUserCacheSchema = createInsertSchema(userCache).omit({
  createdAt: true,
  updatedAt: true,
  lastSeen: true,
});
export type InsertUserCache = z.infer<typeof insertUserCacheSchema>;
export type UserCache = typeof userCache.$inferSelect;

// Permission override types
export const insertPermissionOverrideSchema = createInsertSchema(tenantPermissionOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPermissionOverride = z.infer<typeof insertPermissionOverrideSchema>;
export type PermissionOverride = typeof tenantPermissionOverrides.$inferSelect;

// Audit log types
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Business data types
export const insertDataSchema = createInsertSchema(data).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertData = z.infer<typeof insertDataSchema>;
export type Data = typeof data.$inferSelect;