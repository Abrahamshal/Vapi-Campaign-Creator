# Vapi Campaign Builder - PRD v2.0

## Overview

**Product Name:** Vapi Campaign Builder  
**Type:** Web Application with Serverless Functions  
**Version:** 2.0 MVP  
**Date:** December 2024

A secure web tool that lets users create Vapi campaigns by entering their own API key, uploading a lead list, and submitting through a proxy that handles CORS and protects their credentials.

## Problem Statement

Creating Vapi campaigns requires:
- Properly formatting phone numbers to E.164 format
- Structuring data in Vapi's expected JSON format
- Batching large datasets to respect API limits
- Technical knowledge to make API calls
- Dealing with CORS restrictions when calling APIs from browsers

This tool eliminates these barriers with a simple 3-step process while maintaining security.

## Core Functionality

### User Flow
1. **Enter Credentials**
   - User's own Vapi API Key (validated on entry)
   - Campaign Name
   
2. **Upload Lead List**
   - Drag & drop Excel/CSV file
   - Preview data before processing
   - Auto-detect columns with confidence scoring
   - Map phone/name/email fields

3. **Process & Submit**
   - System validates and cleans data in chunks
   - Formats phone numbers
   - Sends to Vapi through secure proxy
   - Shows real-time progress
   - Download results report

## Technical Architecture

### Hybrid Architecture: Frontend + Serverless Functions
```
- Frontend: Next.js 14 (React)
- Backend: Vercel Serverless Functions (proxy layer)
- UI: Tailwind CSS + shadcn/ui
- File Parsing: SheetJS (client-side)
- Phone Formatting: libphonenumber-js
- Heavy Processing: Web Workers
- Deployment: Vercel
```

### Architecture Benefits
- **CORS Solution**: Serverless functions act as proxy to Vapi API
- **Security**: API keys never exposed in browser network logs
- **Performance**: Web Workers for large dataset processing
- **Scalability**: Each user uses their own API quota
- **Cost**: Minimal (within Vercel free tier)

## Feature Specifications

### 1. API Key Management
```javascript
{
  apiKey: "sk_live_...",        // User's own Vapi API key
  campaignName: "Q1 Outreach",   // Campaign identifier
  file: File                     // Lead data file
}
```

**Security Features:**
- API key stored in sessionStorage (cleared on tab close)
- Masked input field (password type)
- Format validation (must start with `sk_`)
- Test API key validity before processing
- Never logged or stored server-side

### 2. File Processing with Performance Optimization

**Supported Formats:** CSV, XLSX, XLS  
**Max Size:** 50MB (browser limitation)  
**Max Rows:** 100,000 (with chunked processing)

**Chunked Processing Strategy:**
```javascript
// Process in chunks to prevent UI freezing
{
  chunkSize: 1000,              // Rows per chunk
  yieldInterval: 50,            // ms between chunks
  useWebWorker: true,           // For datasets > 10,000 rows
  memoryThreshold: 500          // MB before warning user
}
```

**Web Worker Implementation:**
- Offload heavy processing to background thread
- Parse and validate data without blocking UI
- Progress updates via message passing
- Automatic fallback for unsupported browsers

### 3. Column Detection & Mapping

**Auto-detection with Confidence Scoring:**
```javascript
{
  phone: { 
    detected: "mobile_number", 
    confidence: 0.95,
    alternates: ["phone", "cell"]
  },
  name: {
    detected: "customer_name",
    confidence: 0.85,
    alternates: ["full_name", "contact"]
  }
}
```

**Manual Override UI:**
- Dropdown for each required field
- Preview of sample data
- Validation before proceeding

### 4. Data Validation & Cleaning

**Phone Number Processing:**
- Detect country code (default US if missing)
- Convert to E.164 format (+1XXXXXXXXXX)
- Validate using libphonenumber-js
- Flag invalid numbers with reasons

**Data Quality Checks:**
- Remove duplicate phone numbers
- Trim whitespace and special characters
- Validate email format if present
- Skip rows with critical missing data
- Generate cleaning report

### 5. Serverless Proxy Architecture

**Vercel Function Structure:**
```javascript
// /api/vapi-proxy/[...path].js
export default async function handler(req, res) {
  // Extract user's API key from header
  const userApiKey = req.headers['x-vapi-key'];
  
  // Validate API key format
  if (!userApiKey?.startsWith('sk_')) {
    return res.status(400).json({ 
      error: 'Invalid API key format' 
    });
  }
  
  // Rate limiting per IP
  const clientIp = req.headers['x-forwarded-for'];
  if (await isRateLimited(clientIp)) {
    return res.status(429).json({ 
      error: 'Too many requests' 
    });
  }
  
  // Forward request to Vapi
  const vapiResponse = await fetch(
    `https://api.vapi.ai/${req.query.path.join('/')}`,
    {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${userApiKey}`,
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    }
  );
  
  // Return Vapi response
  const data = await vapiResponse.json();
  res.status(vapiResponse.status).json(data);
}
```

**Security Features:**
- API keys only in request headers, never stored
- Rate limiting (10 requests per minute per IP)
- Request size limits (10MB max)
- Input sanitization
- Error message sanitization (no key leakage)

### 6. Batch Processing Strategy

**Adaptive Batching:**
```javascript
{
  minBatchSize: 100,
  maxBatchSize: 1000,
  delayBetweenBatches: 2000,  // ms
  retryOnFailure: true,
  maxRetries: 3,
  exponentialBackoff: true
}
```

**Progress Tracking:**
- Current batch number
- Successful/failed leads per batch
- Estimated time remaining
- Cancel operation support
- Resume capability (within session)

### 7. Error Handling & Recovery

**Error Categories:**
- **Validation Errors**: Show inline with affected rows
- **API Errors**: Display Vapi error messages
- **Network Errors**: Retry with exponential backoff
- **Processing Errors**: Log and skip problematic rows

**Recovery Features:**
- Download partial results
- Export error log with row numbers
- Retry failed batches
- Clear instructions for resolution

## UI/UX Specifications

### Main Screen with Validation
```
┌─────────────────────────────────────┐
│      Vapi Campaign Builder          │
│                                     │
│  API Key: [••••••••••••••••••]     │
│           ✓ Valid API key           │
│                                     │
│  Campaign: [___________________]    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   Drop Excel/CSV here       │   │
│  │   or click to browse        │   │
│  │   Max: 100,000 rows         │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Validate Data] [Create Campaign]  │
└─────────────────────────────────────┘
```

### Data Preview & Mapping Screen
```
┌─────────────────────────────────────┐
│      Map Your Data Fields          │
│                                     │
│  Detected 52,432 rows              │
│                                     │
│  Phone Column: [Mobile Number ▼]   │
│  Sample: (555) 123-4567            │
│                                     │
│  Name Column: [Customer Name ▼]    │
│  Sample: John Doe                  │
│                                     │
│  Email Column: [Email Address ▼]   │
│  Sample: john@example.com          │
│                                     │
│  ⚠ 1,234 rows have invalid phones  │
│                                     │
│  [Back] [Process Data]              │
└─────────────────────────────────────┘
```

### Processing Screen with Details
```
┌─────────────────────────────────────┐
│      Processing Your Campaign       │
│                                     │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 60%           │
│                                     │
│  ✓ File parsed (52,432 rows)       │
│  ✓ Data validated (51,198 valid)   │
│  ✓ Duplicates removed (234)        │
│  ⟳ Sending batch 31 of 52...       │
│                                     │
│  Time elapsed: 1m 23s              │
│  Est. remaining: 45s               │
│                                     │
│  [Pause] [Cancel]                   │
└─────────────────────────────────────┘
```

## Code Structure

```
vapi-campaign-builder/
├── app/
│   ├── page.tsx              # Main form component
│   ├── layout.tsx            # App layout
│   ├── globals.css           # Tailwind styles
│   └── api/
│       ├── vapi-proxy/
│       │   └── [...path]/
│       │       └── route.ts  # Serverless proxy function
│       └── validate-key/
│           └── route.ts       # API key validation endpoint
├── components/
│   ├── FileUpload.tsx        # Drag & drop with validation
│   ├── FieldMapper.tsx       # Column mapping UI
│   ├── DataPreview.tsx       # Data preview table
│   ├── ProgressTracker.tsx   # Multi-stage progress
│   └── ResultSummary.tsx     # Detailed results
├── lib/
│   ├── fileParser.ts         # Excel/CSV parsing
│   ├── phoneFormatter.ts     # E.164 formatting
│   ├── dataValidator.ts      # Data cleaning logic
│   ├── chunkProcessor.ts     # Chunked processing
│   └── vapiClient.ts         # API client with proxy
├── public/
│   └── workers/
│       └── dataProcessor.js  # Web Worker for heavy processing
└── [config files]
```

## Implementation Plan

### Week 1: Core Infrastructure
- [x] Setup Next.js with Vercel deployment
- [x] Implement serverless proxy functions
- [x] API key validation flow
- [x] Basic file upload and parsing
- [x] Chunked processing implementation

### Week 2: Processing & UI
- [x] Web Worker integration
- [x] Phone number formatting with libphonenumber-js
- [x] Column detection and mapping UI
- [x] Progress tracking system
- [x] Error handling and recovery

### Week 3: Polish & Testing
- [ ] Batch processing optimization
- [ ] Memory usage monitoring
- [ ] Comprehensive error messages
- [ ] Download reports functionality
- [ ] Performance testing with large datasets
- [ ] Deploy to production

## Performance Requirements

- **UI Responsiveness**: Never freeze for > 100ms
- **Processing Speed**: 10,000 rows/minute minimum
- **Memory Usage**: Warn at 500MB, stop at 1GB
- **API Throughput**: Handle rate limits gracefully
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+

## Success Metrics

- Time to create campaign: < 3 minutes for 50k rows
- API key security: Zero exposure in browser logs
- Success rate: > 95% for valid data
- Memory efficiency: Handle 100k rows on 4GB RAM device
- User errors: < 5% abandonment due to confusion

## Security Specifications

### Client-Side Security
- API keys in sessionStorage only (cleared on close)
- Input sanitization for all user data
- Content Security Policy headers
- HTTPS enforced

### Server-Side Security
- API keys never logged or stored
- Rate limiting per IP address
- Request size limits
- Sanitized error messages
- Environment variable validation

## Error Handling Matrix

| Error Type | User Message | Action | Recovery |
|------------|--------------|--------|----------|
| Invalid API Key | "Please check your API key" | Block submission | Re-enter key |
| Rate Limit | "Too many requests, waiting..." | Auto-retry | Exponential backoff |
| Network Error | "Connection issue, retrying..." | Auto-retry | Manual retry option |
| Invalid Data | "X rows have invalid phones" | Show details | Download error log |
| Memory Limit | "File too large for browser" | Stop processing | Suggest smaller chunks |

## Browser Compatibility

### Required Features
- Web Workers API
- File API
- Fetch API
- SessionStorage
- ES6+ JavaScript

### Minimum Versions
- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- No IE11 support

## Limitations & Constraints

- **File Size**: 50MB maximum (browser constraint)
- **Row Limit**: 100,000 rows (memory constraint)
- **Session Based**: Progress lost on page refresh
- **Desktop Only**: No mobile optimization
- **Single File**: No multiple file upload
- **US Phone Numbers**: International support limited

## Future Enhancements (Post-MVP)

- **Phase 2**:
  - International phone number support
  - Progress persistence with IndexedDB
  - Multiple file upload
  - Saved field mapping templates
  
- **Phase 3**:
  - Real-time collaboration
  - Webhook notifications
  - API usage analytics
  - Chrome extension version

---

**Infrastructure Cost:** ~$0-20/month (Vercel free/pro tier)  
**Maintenance:** Minimal (serverless architecture)