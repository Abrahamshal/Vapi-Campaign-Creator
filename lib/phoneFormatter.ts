import { parsePhoneNumber, CountryCode } from 'libphonenumber-js'

export interface PhoneFormatResult {
  isValid: boolean
  formatted?: string
  error?: string
}

export function formatPhoneNumber(phone: string, defaultCountry: CountryCode = 'US'): PhoneFormatResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required'
    }
  }

  // Clean the phone number - remove all non-digit characters except + at the start
  let cleanPhone = phone.trim()
  
  try {
    const phoneNumber = parsePhoneNumber(cleanPhone, defaultCountry)
    
    if (!phoneNumber) {
      return {
        isValid: false,
        error: 'Unable to parse phone number'
      }
    }
    
    if (!phoneNumber.isValid()) {
      return {
        isValid: false,
        error: 'Invalid phone number format'
      }
    }
    
    return {
      isValid: true,
      formatted: phoneNumber.format('E.164')
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to parse phone number'
    }
  }
}