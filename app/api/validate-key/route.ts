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
    
    // For now, just validate the format since we can't test against Vapi directly
    // The actual validation will happen when making the first real API call
    // This is because Vapi might not have a simple test endpoint
    
    // You could also test with a real endpoint if you know one exists
    // For now, we'll just check the format and return valid
    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate API key' },
      { status: 500 }
    )
  }
}