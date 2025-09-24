# Overview

This is a production-ready microservice template designed for building ERP components within a larger childcare management system. The template provides foundational infrastructure including multi-tenant architecture, role-based access control (RBAC), AI service integrations, and dual database support. It serves as a starting point for creating new microservices that need to integrate seamlessly with the parent childcare ERP system while maintaining consistent authentication, authorization, and user experience patterns.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18 + TypeScript**: Modern React with strict TypeScript for type safety
- **Vite**: Fast development server and build tool with hot module replacement
- **Tailwind CSS + Shadcn/ui**: Utility-first styling with pre-built accessible components
- **React Query (@tanstack/react-query)**: Efficient server state management with caching
- **Wouter**: Lightweight client-side routing
- **Custom Design System**: Childcare-themed color palette (coral red, turquoise, sky blue, mint green, soft yellow)

## Backend Architecture
- **Node.js + Express**: RESTful API server with TypeScript
- **JWT Authentication**: Token-based auth that integrates with parent ERP system
- **Multi-tenant Middleware**: Automatic tenant isolation in all requests
- **RBAC Middleware**: Role-based permission checking with tenant-specific overrides
- **Audit Logging**: Comprehensive action tracking for compliance

## Data Storage Architecture
- **PostgreSQL (Primary)**: Main microservice database using Drizzle ORM
- **MySQL (Read-only)**: Connection to parent app for shared data (locations, rooms, tags)
- **Multi-tenant Schema**: All tables include tenantId for data isolation
- **Caching Layer**: In-memory caching for frequently accessed data with TTL

## Authentication & Authorization
- **JWT Token Integration**: Validates tokens issued by parent ERP system
- **User Cache Table**: Stores user info from JWT tokens for reference
- **Tenant Permission Overrides**: Allows organizations to customize role permissions
- **Default Role Permissions**: Predefined permissions for teacher, assistant_director, director, admin, superadmin
- **Location-based Access**: Users can be restricted to specific locations within their organization

## Key Design Patterns
- **Repository Pattern**: Storage interface abstracts database operations
- **Service Layer**: Separate services for AI integrations (OpenAI, Claude, Perplexity) and MySQL operations
- **Middleware Chain**: Authentication → Permission checking → Route handling
- **Context Providers**: React contexts for custom labels and favorites management
- **Component Composition**: Reusable UI components with consistent theming

## Development Features
- **Token Switcher**: Development tool for testing different user roles
- **Environment-aware Configuration**: Different behaviors for development vs production
- **Type Safety**: Shared TypeScript schemas between frontend and backend
- **Testing Infrastructure**: JWT helpers and test utilities for different user roles

# External Dependencies

## AI Services
- **OpenAI**: GPT models for content generation and AI features
- **Anthropic Claude**: Alternative AI service for text generation
- **Perplexity**: AI-powered search and content creation

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting (@neondatabase/serverless)
- **MySQL**: Connection to parent ERP application database for shared data
- **Drizzle ORM**: Type-safe database operations with automatic migrations

## Cloud Services
- **AWS S3**: File storage with presigned URLs for secure uploads
- **AWS SDK**: S3 client and request presigner for file operations

## UI Components
- **Radix UI**: Unstyled, accessible component primitives for complex UI elements
- **Lucide React**: Consistent icon library for the interface
- **React Hook Form**: Form state management with validation

## Development Tools
- **Vite**: Development server and build tool
- **ESBuild**: Fast TypeScript compilation for production builds
- **Vitest**: Testing framework with coverage reporting
- **Replit Plugins**: Runtime error overlay and code mapping for Replit environment