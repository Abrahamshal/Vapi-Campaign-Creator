import { formatPhoneNumber } from './phoneFormatter'

export interface ValidatedLead {
  name: string
  number: string
  email?: string
}

export interface ValidationResult {
  valid: ValidatedLead[]
  invalid: {
    rowIndex: number
    data: any
    errors: string[]
  }[]
  duplicates: number
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateRows: number
  }
}

export function validateAndCleanData(
  data: Array<{
    rowIndex: number
    phone: string
    name: string
    email: string
    originalData: any
  }>
): ValidationResult {
  const valid: ValidatedLead[] = []
  const invalid: Array<{
    rowIndex: number
    data: any
    errors: string[]
  }> = []
  const seenPhones = new Set<string>()
  let duplicates = 0

  data.forEach(row => {
    const errors: string[] = []
    
    // Validate phone number
    const phoneResult = formatPhoneNumber(row.phone)
    if (!phoneResult.isValid || !phoneResult.formatted) {
      errors.push(`Invalid phone: ${phoneResult.error || 'Unknown error'}`)
    }
    
    // Check for duplicates
    if (phoneResult.formatted && seenPhones.has(phoneResult.formatted)) {
      errors.push('Duplicate phone number')
      duplicates++
    }
    
    // Validate email if present
    let cleanEmail = row.email?.trim() || ''
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      errors.push('Invalid email format')
      cleanEmail = '' // Clear invalid email
    }
    
    // Clean name
    const cleanName = cleanText(row.name)
    
    // If we have errors, add to invalid list
    if (errors.length > 0) {
      invalid.push({
        rowIndex: row.rowIndex,
        data: row.originalData,
        errors
      })
    } else if (phoneResult.formatted) {
      // Add to valid list
      seenPhones.add(phoneResult.formatted)
      valid.push({
        name: cleanName,
        number: phoneResult.formatted,
        ...(cleanEmail && { email: cleanEmail })
      })
    }
  })

  return {
    valid,
    invalid,
    duplicates,
    summary: {
      totalRows: data.length,
      validRows: valid.length,
      invalidRows: invalid.length,
      duplicateRows: duplicates
    }
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function cleanText(text: string): string {
  if (!text) return ''
  
  // Trim whitespace
  let cleaned = text.trim()
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Remove special characters that might cause issues
  cleaned = cleaned.replace(/[<>\"]/g, '')
  
  return cleaned
}