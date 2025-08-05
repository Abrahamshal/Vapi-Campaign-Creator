# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vapi Campaign Builder - A Next.js 14 web application that allows users to create Vapi campaigns by uploading lead lists (CSV/Excel), validating phone numbers, and batching data to the Vapi API. Users provide their own API keys for security.

## Commands

```bash
# Development
npm run dev          # Start development server on http://localhost:3000

# Production
npm run build        # Build for production (creates .next directory)
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint

# Dependencies
npm install          # Install all dependencies
npx shadcn@latest add [component]  # Add new shadcn/ui components
```

## Architecture

### Core Data Flow
1. **User Input** → API key and campaign name entered in `app/page.tsx`
2. **File Upload** → Excel/CSV parsed client-side using `xlsx` library in `lib/fileParser.ts`
3. **Column Detection** → Auto-detects phone/name/email columns with confidence scoring
4. **Data Validation** → Phone numbers formatted to E.164 using `libphonenumber-js` in `lib/phoneFormatter.ts`
5. **Chunked Processing** → Large datasets (>10k rows) processed via Web Workers (`public/workers/dataProcessor.js`)
6. **API Proxy** → All Vapi calls go through serverless functions to handle CORS and protect API keys
7. **Batch Upload** → Leads sent in 1000-record batches with 2-second delays

### Security Architecture
- **Dynamic API Keys**: Users provide their own Vapi API keys per session (stored in sessionStorage)
- **Proxy Pattern**: `/api/vapi-proxy/[...path]/route.ts` forwards requests to Vapi API
- **Rate Limiting**: 10 requests/minute per IP (in-memory for dev, needs Redis for production)
- **Validation Endpoint**: `/api/validate-key/route.ts` tests API keys before processing

### Performance Optimizations
- **ChunkProcessor** (`lib/chunkProcessor.ts`): Processes data in 1000-row chunks with UI yielding
- **Web Workers**: Automatically used for datasets >10,000 rows to prevent UI blocking
- **Memory Monitoring**: Warns at 500MB usage, stops at 1GB
- **Progress Tracking**: Real-time updates during processing

### Component State Flow
The main page (`app/page.tsx`) manages four states:
- `input`: Initial form with API key, campaign name, file upload
- `mapping`: Column detection and field mapping
- `processing`: Shows progress during validation and upload
- `complete`: Displays results with download option

### API Route Structure
All API routes use Next.js 14 App Router format:
- Routes defined in `app/api/*/route.ts` files
- Dynamic segments use `[...path]` for catch-all routing
- Return `NextResponse` objects with proper status codes

### Data Validation Pipeline
1. `fileParser.ts`: Extracts raw data from Excel/CSV
2. `dataValidator.ts`: Validates phones, removes duplicates, cleans text
3. `phoneFormatter.ts`: Converts to E.164 format with country code detection
4. `vapiClient.ts`: Batches and sends to Vapi API

## Deployment Notes

### Vercel Configuration
- Framework: Next.js (auto-detected)
- Root Directory: Leave empty or set to `.`
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

### Environment Variables
No environment variables required - users provide API keys through the UI.

## Component Dependencies

### UI Components (shadcn/ui)
- Based on Radix UI primitives
- Styled with Tailwind CSS
- Components in `components/ui/` are generated - modify with caution
- Custom components in `components/` wrap UI primitives

### Key Libraries
- `xlsx`: Excel/CSV parsing (client-side only)
- `libphonenumber-js`: Phone validation and E.164 formatting
- `lucide-react`: Icon library
- `class-variance-authority` + `clsx` + `tailwind-merge`: Style composition

## Error Handling Patterns

- API errors return standardized JSON: `{ error: string }`
- Client-side validation shows inline errors before submission
- Failed batches tracked and reported in final summary
- Network errors trigger exponential backoff retries

## Testing Considerations

When testing file uploads:
- Small files (<1000 rows): Processed synchronously
- Medium files (1000-10000 rows): Chunked processing
- Large files (>10000 rows): Web Worker processing
- Maximum file size: 50MB (browser limitation)