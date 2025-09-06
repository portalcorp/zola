# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun run dev` - Start development server with Turbopack
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run type-check` - Run TypeScript type checking

## Architecture Overview

Zola is a Next.js 15 app with React 19 that provides a multi-model AI chat interface. The architecture follows a modern full-stack pattern with TypeScript throughout.

### Core Technologies
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI primitives + motion-primitives
- **AI Integration**: Vercel AI SDK with multiple provider support
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with Google OAuth + guest mode
- **State Management**: Zustand stores for chat, models, user data
- **File Handling**: Supabase storage for chat attachments and avatars

### Project Structure

#### `/app` - Next.js App Router
- `api/` - API routes for chat, auth, models, user management
- `components/` - Page-specific React components
- `types/` - TypeScript type definitions for API and database

#### `/lib` - Core Business Logic
- `models/` - AI model configurations and dynamic loading (supports 8 providers)
- `chat-store/` - Zustand stores for chat state management
- `supabase/` - Database client configuration and utilities
- `openproviders/` - AI provider integrations (OpenAI, Anthropic, etc.)
- `user-keys.ts` - BYOK (Bring Your Own Key) encrypted storage system

#### `/components` - Reusable UI Components
- `ui/` - shadcn/ui base components
- `prompt-kit/` - AI-specific UI components (chat interface, markdown)
- `motion-primitives/` - Animated components
- `common/` - Shared business components

### Key Features Architecture

#### Multi-Model Support
- Dynamic model loading from 8+ providers (OpenAI, Anthropic, Google, etc.)
- Ollama integration for local models (auto-detection)
- Model access control (free vs pro models)
- BYOK system for user API keys with AES encryption

#### Chat System
- Real-time streaming via AI SDK
- Message persistence in Supabase
- File upload support with type validation
- Project-based chat organization
- Public chat sharing functionality

#### Authentication Flow
- Supabase Auth with Google OAuth
- Guest mode for unauthenticated users
- Rate limiting (5 messages/day for guests, 1000 for authenticated)
- User preferences and system prompt customization

#### Security
- CSRF protection via middleware
- Content Security Policy headers
- API key encryption for BYOK
- Row Level Security on all database tables

## Environment Configuration

Required environment variables (see INSTALL.md for details):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE` - Supabase service role key
- `CSRF_SECRET` - CSRF protection secret
- `ENCRYPTION_KEY` - Base64 key for BYOK encryption
- AI provider keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.
- `OLLAMA_BASE_URL` - For local Ollama integration (default: http://localhost:11434)

## Database Schema

Key tables in Supabase:
- `users` - User profiles with daily limits and preferences
- `chats` - Chat sessions with optional project association
- `messages` - Individual messages with role and content
- `projects` - User-created chat organization
- `user_keys` - Encrypted BYOK API keys
- `user_preferences` - UI and interaction preferences

## Development Notes

### AI Model Integration
- Models are loaded dynamically via `lib/models/index.ts`
- Each provider has its own data file in `lib/models/data/`
- Ollama models are detected at runtime when enabled
- Model configurations include tags, pricing, and provider info

### State Management
- Chat state: `lib/chat-store/` - messages, conversations, persistence
- User state: `lib/user-store/` - authentication, preferences
- Model state: `lib/model-store/` - available models, selection

### File Upload System
- Handled via `lib/file-handling.ts`
- Supported formats: images, text files, PDFs
- Files stored in Supabase storage buckets
- Size limits and type validation enforced

### Local Development with Ollama
- Install Ollama and pull models (e.g., `ollama pull llama3.2`)
- Zola auto-detects available local models
- Use `DISABLE_OLLAMA=true` to disable in development
- Production has Ollama disabled by default

### Testing and Quality
- ESLint with Next.js config
- TypeScript strict mode enabled
- Bundle analyzer available with `ANALYZE=true bun run build`
