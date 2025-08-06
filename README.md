# Vapi Campaign Builder

A web application for creating Vapi campaigns by uploading lead lists (CSV/Excel), validating phone numbers, and batching data to the Vapi API.

## Features

- 📁 **File Upload**: Drag & drop CSV/Excel files
- 🔍 **Smart Column Detection**: Auto-detects phone, name, and email columns
- 📞 **Phone Validation**: Formats phone numbers to E.164 standard
- 🔐 **Secure**: Users provide their own Vapi API keys (never stored)
- ⚡ **Performance**: Processes large datasets with Web Workers
- 🎯 **Batch Processing**: Sends leads in optimized batches

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm run build
npm start
```

## How to Use

1. **Get your Vapi API Key**
   - Log into your Vapi account
   - Navigate to API settings
   - Copy your API key (UUID format)

2. **Prepare your lead list**
   - CSV or Excel file with columns for name, phone, and email
   - Example format included: `sample-leads.csv`

3. **Create Campaign**
   - Enter your Vapi API key
   - Enter a campaign name
   - Upload your lead file
   - Click "Validate Data"
   - Review column mapping
   - Click "Process Data"

## Test File

Use `sample-leads.csv` included in the project to test the application:
```csv
name,phone,email
John Doe,555-123-4567,john@example.com
Jane Smith,(555) 234-5678,jane@example.com
...
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Deploy with default settings (no environment variables needed)

## API Key Security

- API keys are only stored in browser session storage
- Keys are never sent to our servers
- All API calls go through serverless proxy functions
- Keys are cleared when tab is closed

## File Limits

- **Max file size**: 50MB
- **Max rows**: 100,000
- **Supported formats**: CSV, XLSX, XLS

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Vercel Serverless Functions

## License

MIT 