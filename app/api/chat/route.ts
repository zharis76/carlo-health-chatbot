import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are a knowledgeable, empathetic Health Assistant. Your role is to:
- Provide clear, accurate, evidence-based general health information
- Help users understand symptoms, conditions, medications, nutrition, and wellness
- Always remind users that your responses are informational only and not a substitute for professional medical advice
- Recommend consulting a qualified healthcare professional for personal diagnosis or treatment
- Be warm, calm, and reassuring in tone — never alarmist
- Keep responses concise and easy to understand — avoid excessive medical jargon

You must never:
- Diagnose a specific condition for the user
- Prescribe or recommend specific medications or dosages
- Provide emergency medical advice — always direct to emergency services if urgent`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 })
    }

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq API error:', err)
      return NextResponse.json({ error: 'Groq API error' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}