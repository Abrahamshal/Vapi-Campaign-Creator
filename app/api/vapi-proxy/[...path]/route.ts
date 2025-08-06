import { NextRequest, NextResponse } from 'next/server'

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }) // 1 minute window
    return false
  }
  
  if (limit.count >= 10) { // 10 requests per minute
    return true
  }
  
  limit.count++
  return false
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Extract user's API key from header
    const userApiKey = request.headers.get('x-vapi-key')
    
    // Validate API key format - Vapi uses UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!userApiKey || !uuidRegex.test(userApiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key format - should be a UUID' },
        { status: 400 }
      )
    }
    
    // Rate limiting per IP
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      )
    }
    
    // Get the path from params
    const path = params.path?.join('/') || ''
    
    // Get request body
    const body = await request.json()
    
    // Forward request to Vapi
    const vapiResponse = await fetch(
      `https://api.vapi.ai/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )
    
    // Get response data
    const data = await vapiResponse.json()
    
    // Return Vapi response with same status
    return NextResponse.json(data, { status: vapiResponse.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Extract user's API key from header
    const userApiKey = request.headers.get('x-vapi-key')
    
    // Validate API key format - Vapi uses UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!userApiKey || !uuidRegex.test(userApiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key format - should be a UUID' },
        { status: 400 }
      )
    }
    
    // Rate limiting per IP
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      )
    }
    
    // Get the path from params
    const path = params.path?.join('/') || ''
    
    // Forward request to Vapi
    const vapiResponse = await fetch(
      `https://api.vapi.ai/${path}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    // Get response data
    const data = await vapiResponse.json()
    
    // Return Vapi response with same status
    return NextResponse.json(data, { status: vapiResponse.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}