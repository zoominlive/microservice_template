CREATE TABLE "permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"permission_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_settings" json DEFAULT '{}'::json,
	"default_timezone" varchar(50) DEFAULT 'America/New_York',
	"default_locale" varchar(10) DEFAULT 'en-US',
	"auto_save_interval" integer DEFAULT 5,
	"enable_notifications" boolean DEFAULT true,
	"custom_labels" json DEFAULT '{}'::json,
	"features" json DEFAULT '{}'::json,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_secrets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"jwt_secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text NOT NULL,
	"locations" json DEFAULT '[]'::json NOT NULL,
	"first_login_date" timestamp DEFAULT now() NOT NULL,
	"last_login_date" timestamp DEFAULT now() NOT NULL,
	"login_count" integer DEFAULT 1 NOT NULL,
	"last_token_payload" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_cache" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_cache" CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "changes" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "data" ALTER COLUMN "user_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "data" ALTER COLUMN "content" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "data" ALTER COLUMN "metadata" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "data" ALTER COLUMN "location_ids" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "data" ALTER COLUMN "approved_by" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "tenant_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "roles_required" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "roles_required" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "roles_required" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "auto_approve_roles" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "auto_approve_roles" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "auto_approve_roles" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ADD COLUMN "permission_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_secrets" ADD CONSTRAINT "token_secrets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_cache" ADD CONSTRAINT "users_cache_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" ADD CONSTRAINT "tenant_permission_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" DROP COLUMN "permission";--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "tenant_permission_overrides" DROP COLUMN "active";