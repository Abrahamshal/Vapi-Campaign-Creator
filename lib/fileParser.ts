import * as XLSX from 'xlsx'

export interface ParsedData {
  headers: string[]
  rows: Record<string, any>[]
  totalRows: number
}

export interface ColumnDetection {
  field: 'phone' | 'name' | 'email'
  detectedColumn: string | null
  confidence: number
  alternates: string[]
}

export async function parseFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false, // Convert all values to strings
          defval: '' // Default value for empty cells
        })
        
        if (jsonData.length === 0) {
          throw new Error('No data found in file')
        }

        // Get headers
        const headers = Object.keys(jsonData[0] as object)
        
        resolve({
          headers,
          rows: jsonData as Record<string, any>[],
          totalRows: jsonData.length
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    // Read as binary string for XLSX
    reader.readAsBinaryString(file)
  })
}

export function detectColumns(headers: string[]): ColumnDetection[] {
  const phonePatterns = ['phone', 'mobile', 'cell', 'number', 'telephone', 'contact']
  const namePatterns = ['name', 'customer', 'client', 'contact', 'person', 'lead']
  const emailPatterns = ['email', 'mail', 'email_address', 'e-mail']

  const detections: ColumnDetection[] = []

  // Detect phone column
  const phoneDetection = detectColumn(headers, phonePatterns)
  detections.push({
    field: 'phone',
    detectedColumn: phoneDetection.column,
    confidence: phoneDetection.confidence,
    alternates: phoneDetection.alternates
  })

  // Detect name column
  const nameDetection = detectColumn(headers, namePatterns)
  detections.push({
    field: 'name',
    detectedColumn: nameDetection.column,
    confidence: nameDetection.confidence,
    alternates: nameDetection.alternates
  })

  // Detect email column
  const emailDetection = detectColumn(headers, emailPatterns)
  detections.push({
    field: 'email',
    detectedColumn: emailDetection.column,
    confidence: emailDetection.confidence,
    alternates: emailDetection.alternates
  })

  return detections
}

function detectColumn(headers: string[], patterns: string[]) {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const scores: { column: string; score: number }[] = []
  
  headers.forEach((header, index) => {
    const normalized = normalizedHeaders[index]
    let score = 0
    
    patterns.forEach(pattern => {
      if (normalized === pattern) {
        score += 10 // Exact match
      } else if (normalized.includes(pattern)) {
        score += 5 // Contains pattern
      } else if (pattern.includes(normalized) && normalized.length > 3) {
        score += 2 // Pattern contains header
      }
    })
    
    if (score > 0) {
      scores.push({ column: header, score })
    }
  })
  
  scores.sort((a, b) => b.score - a.score)
  
  const bestMatch = scores[0]
  const alternates = scores.slice(1, 4).map(s => s.column)
  
  return {
    column: bestMatch?.column || null,
    confidence: bestMatch ? Math.min(bestMatch.score / 10, 1) : 0,
    alternates
  }
}

export function extractDataByColumns(
  rows: Record<string, any>[],
  phoneColumn: string,
  nameColumn?: string,
  emailColumn?: string
) {
  return rows.map((row, index) => ({
    rowIndex: index + 1,
    phone: row[phoneColumn] || '',
    name: nameColumn ? row[nameColumn] || '' : '',
    email: emailColumn ? row[emailColumn] || '' : '',
    originalData: row
  }))
}