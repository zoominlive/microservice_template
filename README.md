# ⚠️ IMPORTANT: THIS IS A MICROSERVICE TEMPLATE - READ BEFORE MODIFYING

## 🛑 FOR AI AGENTS: STOP AND READ THIS FIRST

**DO NOT START MODIFYING THIS CODE IMMEDIATELY**. This is a **TEMPLATE REPOSITORY** for building microservices that integrate with a larger childcare ERP system.

### Critical Instructions for AI Agents:
1. **This is NOT a standalone application** - it's a template for creating new microservices
2. **DO NOT modify placeholder content** without understanding the specific microservice requirements
3. **DO NOT remove authentication, multi-tenancy, or RBAC infrastructure**
4. **UNDERSTAND the user's specific microservice needs BEFORE making any changes**
5. **Plan your modifications carefully** - this template provides the foundation, you add the specific features

---

# Microservice Template for Childcare ERP System

A production-ready template for building ERP microservices with React + Node.js, featuring multi-tenancy, RBAC, AI integrations, and dual database support.

## What This Template Is

This template provides the **foundational infrastructure** for microservices in our childcare ERP ecosystem. It includes:
- Pre-configured authentication that integrates with the parent ERP
- Multi-tenant database schema with automatic isolation
- Role-based access control with permission checking
- Consistent UI/UX matching the main ERP design system
- Development tools like TokenSwitcher for testing

## Features

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Databases**: PostgreSQL (primary), MySQL (parent app read-only)
- **Authentication**: JWT-based with RBAC
- **AI Services**: OpenAI, Claude, Perplexity integrations

### Key Components
- ✅ Multi-tenant architecture with organization isolation
- ✅ Role-based access control (RBAC) system
- ✅ Reusable UI components (MultiSelect with tags, TokenSwitcher)
- ✅ AI service integrations (OpenAI, Claude, Perplexity)
- ✅ MySQL service for parent app data (locations, rooms, tags)
- ✅ Consistent childcare-themed design system
- ✅ Testing utilities with role-specific JWT generation

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - **CRITICAL: Must match parent ERP app (see JWT Authentication section below)**
- `MYSQL_*` - MySQL connection for parent app
- AI API keys (optional): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Or use migrations
npm run db:generate
npm run db:migrate
```

### 4. Development

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## 🔐 JWT Authentication Configuration (CRITICAL FOR NEW AGENTS)

### Understanding JWT_SECRET

**This is the #1 cause of authentication failures in microservices!**

The `JWT_SECRET` environment variable is **absolutely critical** for authentication to work. This microservice doesn't handle user login - instead, it validates JWT tokens created by the parent ERP application.

### How It Works

1. **Parent ERP App**: Creates and signs JWT tokens using its `JWT_SECRET`
2. **This Microservice**: Validates incoming tokens using the **same** `JWT_SECRET`
3. **Token Validation**: If the secrets don't match, all requests will fail with "invalid signature"

### Setting JWT_SECRET

#### For Replit Development:
1. Go to the **Secrets** tab in Replit (lock icon in left sidebar)
2. Add a new secret called `JWT_SECRET`
3. **IMPORTANT**: Use the exact same value as your parent ERP app:
   - If testing: Use `dev-secret-key-for-testing-only`
   - If connecting to existing ERP: Get the secret from the parent app's secrets
   - If production: Use a secure 128-character hex string (shared across all services)

#### For Local Development:
```bash
# In your .env file
JWT_SECRET=dev-secret-key-for-testing-only  # For testing only!
```

### Common Authentication Errors & Solutions

#### Error: "JsonWebTokenError: invalid signature"
**Cause**: JWT_SECRET doesn't match the parent app
**Solution**: 
1. Check parent ERP app's JWT_SECRET value
2. Update this microservice's JWT_SECRET to match exactly
3. Restart the application

#### Error: "jwt must be provided" or "Authentication required"
**Cause**: No JWT token in request
**Solution**: 
1. Ensure you're logged into the parent ERP app
2. Check that tokens are being sent in Authorization header
3. Use TokenSwitcher component for development testing

#### Error: "TokenExpiredError: jwt expired"
**Cause**: Token has expired
**Solution**: Log in again through the parent ERP application

### Testing Authentication in Development

1. **With TokenSwitcher** (Recommended):
   - The TokenSwitcher component (bottom-right corner) lets you test with different roles
   - It generates valid tokens using your configured JWT_SECRET
   - Available only when `ENABLE_DEV_TOOLS=true`

2. **Manual Testing**:
   ```bash
   # Test with curl
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/data
   ```

3. **Verify JWT_SECRET is Set**:
   ```javascript
   // In server console or route
   console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
   console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
   ```

### Important Security Notes

- **Never commit real JWT_SECRET to version control**
- **Use Replit Secrets tab for all sensitive values**
- **JWT_SECRET should be at least 32 characters for production**
- **All microservices in your ERP must share the same JWT_SECRET**
- **Rotate secrets regularly in production environments**

### Quick Troubleshooting Checklist

- [ ] JWT_SECRET is set in Replit Secrets tab
- [ ] JWT_SECRET matches parent ERP app exactly (case-sensitive!)
- [ ] Application has been restarted after setting secrets
- [ ] Token is being sent in Authorization header as "Bearer TOKEN"
- [ ] Token hasn't expired (check token payload)
- [ ] For development: ENABLE_DEV_TOOLS=true for TokenSwitcher

### Getting Help

If authentication still fails after following this guide:
1. Check server logs for specific JWT error messages
2. Verify parent app is generating tokens correctly
3. Use JWT debugger (jwt.io) to inspect token contents (never paste production tokens!)
4. Ensure system clocks are synchronized (for token expiry)

## Project Structure

```
microservice-template/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── ui/       # Shadcn components
│   │   │   ├── navigation-tabs.tsx  # Main navigation
│   │   │   └── token-switcher.tsx   # Role testing
│   │   ├── pages/        # Application pages
│   │   ├── lib/          # Utilities and services
│   │   ├── hooks/        # Custom React hooks
│   │   └── App.tsx       # Main app component
│   └── index.css         # Global styles with color palette
├── server/                # Node.js backend
│   ├── middleware/       # Auth & permission middleware
│   ├── services/         # External services (AI, MySQL)
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Storage interface
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   ├── schema.ts        # Database schemas
│   └── permissions/     # RBAC configuration
└── tests/               # Test utilities
    └── fixtures/        # Test helpers

```

## Color Palette

The template uses a childcare-themed color system:

- **Coral Red**: `#FF6B6B` / `hsl(358, 100%, 69%)`
- **Turquoise**: `#29ABE2` / `hsl(174, 58%, 65%)`
- **Sky Blue**: `#4ECDC4` / `hsl(200, 60%, 63%)`
- **Mint Green**: `#71C285` / `hsl(144, 35%, 72%)`
- **Soft Yellow**: `#FFD93D` / `hsl(48, 100%, 79%)`

## Authentication & RBAC

### Roles
- **SuperAdmin**: Full system access
- **Admin**: Organization management
- **Director**: Location management
- **Assistant Director**: Approval workflows
- **Teacher**: Basic CRUD operations
- **Parent**: Read-only access

### Testing Different Roles

Use the TokenSwitcher component (bottom-right in development) to switch between different user roles for testing.

## Multi-Tenancy

All data is isolated by `tenantId`:
- Database queries automatically filter by tenant
- JWT tokens include tenant information
- MySQL queries use tenant-specific databases

## AI Services

### OpenAI
```typescript
const openAIService = getOpenAIService();
const content = await openAIService.generateContent(prompt);
```

### Claude
```typescript
const claudeService = getClaudeService();
const content = await claudeService.generateContent(prompt);
```

### Perplexity
```typescript
const perplexityService = getPerplexityService();
const content = await perplexityService.searchAndSummarize(query);
```

## MySQL Parent App Integration

Access read-only data from the parent application:

```typescript
const mysqlService = getMySQLService();

// Get locations
const locations = await mysqlService.getLocations(tenantId);

// Get rooms
const rooms = await mysqlService.getRooms(tenantId, locationId);

// Get tags
const tags = await mysqlService.getTags(tenantId);
```

## Reusable Components

### MultiSelect with Tags
```tsx
<MultiSelect
  options={locationOptions}
  selected={selectedLocations}
  onChange={setSelectedLocations}
  enableTags={true}
  tags={tags}
/>
```

### Token Switcher (Dev Only)
Automatically appears in development mode for testing different user roles.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/locations` - Get locations from MySQL
- `GET /api/rooms` - Get rooms from MySQL
- `GET /api/tags` - Get location tags
- `GET /api/data` - List data (with RBAC)
- `POST /api/data` - Create data (with RBAC)
- `PUT /api/data/:id` - Update data (with RBAC)
- `DELETE /api/data/:id` - Delete data (with RBAC)
- `POST /api/ai/generate` - Generate AI content

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## Customization Guide for New Microservices

### IMPORTANT: How to Use This Template

1. **Replace placeholder tabs** ("Place Holder 1/2/3") with your actual features
2. **Update the home page content** in `client/src/pages/HomePage.tsx`
3. **Define your data models** in `shared/schema.ts`
4. **Update permissions** in `client/src/lib/permission-utils.ts` for your features
5. **Add your API routes** in `server/routes.ts`
6. **Implement your business logic** in the storage interface

### DO NOT:
- Remove authentication infrastructure
- Remove multi-tenancy fields (`tenantId`) from database schema
- Change the core navigation structure without approval
- Modify the color scheme without approval
- Remove the TokenSwitcher (needed for development)

### 1. Update Schema
Edit `shared/schema.ts` to define your data models:
```typescript
export const myTable = pgTable("my_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),  // ALWAYS include this
  // Add your fields
});
```

### 2. Update Storage Interface
Modify `server/storage.ts` to add your CRUD operations.

### 3. Add Routes
Update `server/routes.ts` with your API endpoints.

### 4. Create Pages
Add new pages in `client/src/pages/` and register them in `App.tsx`.

### 5. Customize Permissions
Edit `client/src/lib/permission-utils.ts` to define your permission model.

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Important Notes

- **Authentication**: Handled by the parent ERP app - microservices validate tokens only
- **Multi-tenancy**: Every database table MUST include `tenantId` field
- **Consistency**: Maintain the design system and navigation structure across all microservices
- **Development**: Always test with different roles using the TokenSwitcher

## License

MIT