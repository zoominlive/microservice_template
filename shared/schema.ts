import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// CORE MULTI-TENANCY & AUTH INFRASTRUCTURE
// ============================================

// Tenants table - Core of the architecture
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Token secrets table - Each tenant has their own JWT secret
export const tokenSecrets = pgTable("token_secrets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  jwtSecret: text("jwt_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Users cache table - Caches user info from JWT tokens
// In microservices, we don't manage users, just cache their info
export const usersCache = pgTable("users_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").notNull(), // User ID from JWT token
  username: text("username").notNull(), // Username/email from JWT token
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull(), // Admin, Teacher, Director, etc.
  locations: json("locations").$type<string[]>().notNull().default([]), // Array of location IDs from JWT
  firstLoginDate: timestamp("first_login_date").notNull().defaultNow(),
  lastLoginDate: timestamp("last_login_date").notNull().defaultNow(),
  loginCount: integer("login_count").notNull().default(1),
  lastTokenPayload: json("last_token_payload"), // Store complete JWT payload for reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// RBAC (ROLE-BASED ACCESS CONTROL)
// ============================================

// Permissions table - Defines available permissions in the system
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(), // e.g., "data.create", "data.read", "data.update"
  resource: text("resource").notNull(), // e.g., "data", "reports", "settings"
  action: text("action").notNull(), // e.g., "create", "read", "update", "delete"
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roles table - System and custom roles
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(), // "teacher", "director", "admin", etc.
  description: text("description").notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // System roles can't be deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Role-Permission junction table - Links roles to permissions
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenant-specific permission overrides - Customize permissions per tenant
export const tenantPermissionOverrides = pgTable("tenant_permission_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  permissionName: text("permission_name").notNull(), // e.g., "data.approve"
  rolesRequired: json("roles_required").$type<string[]>().notNull().default([]), // Roles that need approval
  autoApproveRoles: json("auto_approve_roles").$type<string[]>().notNull().default([]), // Roles that bypass approval
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tenant settings - Configuration per tenant
export const tenantSettings = pgTable("tenant_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  // Location-specific settings (if your microservice needs location awareness)
  locationSettings: json("location_settings").$type<{
    [locationId: string]: {
      timezone?: string;
      locale?: string;
      customSettings?: Record<string, any>;
    }
  }>().default({}),
  // General settings for the microservice
  defaultTimezone: varchar("default_timezone", { length: 50 }).default("America/New_York"),
  defaultLocale: varchar("default_locale", { length: 10 }).default("en-US"),
  autoSaveInterval: integer("auto_save_interval").default(5), // minutes
  enableNotifications: boolean("enable_notifications").default(true),
  // Custom labels/terminology (e.g., rename features)
  customLabels: json("custom_labels").$type<{
    [key: string]: {
      singular: string;
      plural: string;
    };
  }>().default({}),
  // Feature flags
  features: json("features").$type<{
    [featureName: string]: boolean;
  }>().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// AUDIT & TRACKING
// ============================================

// Audit logs for tracking all actions
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  userRole: text("user_role"),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, etc.
  resource: text("resource").notNull(), // What type of resource
  resourceId: text("resource_id"), // ID of the affected resource
  changes: json("changes"), // What changed (before/after)
  metadata: json("metadata"), // Additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ============================================
// YOUR MICROSERVICE BUSINESS DATA
// ============================================

// Example: Generic data table - REPLACE WITH YOUR ACTUAL BUSINESS ENTITIES
// This is a template showing the pattern for your microservice-specific tables
export const data = pgTable("data", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(), // CRITICAL: Always include for multi-tenant isolation
  userId: varchar("user_id").notNull(), // Who created/owns it (references usersCache)
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"),
  status: text("status").default("draft"),
  content: json("content"),
  metadata: json("metadata"),
  
  // Location-based access control (optional)
  locationId: text("location_id"), // Restrict to specific location
  locationIds: json("location_ids").$type<string[]>(), // Or multiple locations
  
  // Approval workflow fields (if needed)
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// TYPE EXPORTS & SCHEMAS
// ============================================

// Tenant types
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Token secret types
export const insertTokenSecretSchema = createInsertSchema(tokenSecrets).omit({
  id: true,
  createdAt: true,
});
export type InsertTokenSecret = z.infer<typeof insertTokenSecretSchema>;
export type TokenSecret = typeof tokenSecrets.$inferSelect;

// User cache types
export const insertUsersCacheSchema = createInsertSchema(usersCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  firstLoginDate: true,
  lastLoginDate: true,
  loginCount: true,
});
export type InsertUsersCache = z.infer<typeof insertUsersCacheSchema>;
export type UsersCache = typeof usersCache.$inferSelect;

// Permission types
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role types
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Role-Permission types
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Tenant permission override types
export const insertTenantPermissionOverrideSchema = createInsertSchema(tenantPermissionOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTenantPermissionOverride = z.infer<typeof insertTenantPermissionOverrideSchema>;
export type TenantPermissionOverride = typeof tenantPermissionOverrides.$inferSelect;

// Tenant settings types
export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>;
export type TenantSettings = typeof tenantSettings.$inferSelect;

// Audit log types
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Business data types (example)
export const insertDataSchema = createInsertSchema(data).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertData = z.infer<typeof insertDataSchema>;
export type Data = typeof data.$inferSelect;