import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// CARLO COMPLIANCE MIDDLEWARE
// ============================================================
// Once you create your Health project on carlo.algorethics.ai,
// add CARLO_API_KEY and CARLO_PROJECT_ID to your .env.local
// and Vercel environment variables.
// The endpoint structure is ready — no code changes needed.
// ============================================================

const CARLO_ENDPOINT = process.env.CARLO_ENDPOINT || 'https://carlo.algorethics.ai/api/dashboard/analyze'
const CARLO_API_KEY = process.env.CARLO_API_KEY || ''
const CARLO_PROJECT_ID = process.env.CARLO_PROJECT_ID || ''

export interface CarloResult {
  compliant: boolean
  score: number       // 0-100, higher = more compliant
  risk: number        // 0-100, higher = more risky
  reason?: string
  flagged_categories?: string[]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { request_text, response_text } = await req.json()

    // If Carlo keys are not yet configured, pass through with a neutral result
    // Remove this block once your Carlo health project is set up
    if (!CARLO_API_KEY || !CARLO_PROJECT_ID) {
      console.warn('[Carlo] API key or Project ID not configured. Running in bypass mode.')
      return NextResponse.json({
        compliant: true,
        score: 100,
        risk: 0,
        reason: 'Carlo not yet configured — bypass mode active',
      } as CarloResult)
    }

    const carloResponse = await fetch(CARLO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CARLO_API_KEY}`,
      },
      body: JSON.stringify({
        api_key: CARLO_API_KEY,
        project_id: CARLO_PROJECT_ID,
        request_text: request_text || '',
        response_text: response_text || '',
      }),
    })

    if (!carloResponse.ok) {
      console.error('[Carlo] API error:', carloResponse.status, await carloResponse.text())
      // Fail open — don't block users if Carlo is temporarily unavailable
      return NextResponse.json({
        compliant: true,
        score: 80,
        risk: 20,
        reason: 'Carlo temporarily unavailable — fail-open mode',
      } as CarloResult)
    }

    const data: CarloResult = await carloResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Carlo] Compliance check failed:', error)
    return NextResponse.json({
      compliant: true,
      score: 80,
      risk: 20,
      reason: 'Carlo check failed — fail-open mode',
    } as CarloResult)
  }
}
