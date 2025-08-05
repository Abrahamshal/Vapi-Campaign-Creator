import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()
    
    // Validate API key format
    if (!apiKey?.startsWith('sk_')) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API key format' },
        { status: 400 }
      )
    }
    
    // Test the API key with a simple request to Vapi
    const testResponse = await fetch('https://api.vapi.ai/phone-number', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (testResponse.ok) {
      return NextResponse.json({ valid: true })
    } else if (testResponse.status === 401) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API key' },
        { status: 401 }
      )
    } else {
      return NextResponse.json(
        { valid: false, error: 'Could not validate API key' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate API key' },
      { status: 500 }
    )
  }
}