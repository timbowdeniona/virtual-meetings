import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { client } from '@/lib/sanity.server'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export async function POST(req: NextRequest) {
  try {
    const { name, type, instructions, goal, attendeeIds } = await req.json()

    // Fetch personas by _id (expects 'persona.xxx' style ids)
    const personas = attendeeIds?.length
      ? await client.fetch(
          `*[_type == "persona" && _id in $ids]{_id, name, systemInstruction, role}`,
          { ids: attendeeIds }
        )
      : []

    const systemBits = personas.map((p: any) => `- ${p.name} (${p.role}): ${p.systemInstruction}`).join('\n')
    const prompt = `You are facilitating a ${type} meeting. Goal: ${goal || 'Refine the story and produce clear outcomes.'}

Participants (with system instructions):
${systemBits || '- (none provided, assume PO/Dev/QA roles)'}

Jira/user story / context:
${instructions}

Please generate:
1) A realistic, concise transcript of the discussion (~12-20 turns, short lines).
2) 5-8 Gherkin-style acceptance criteria.
3) 3-5 follow-up actions.

Return in sections titled: Transcript, Acceptance Criteria, Actions.`

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: MODEL })
    const res = await model.generateContent(prompt)
    const text = res.response.text()

    // Store as transcript in Sanity
    const attendees = personas.map((p: any) => ({_type: 'reference', _ref: p._id}))
    const doc = await client.create({
      _type: 'transcript',
      meetingId: name || `meeting.${Date.now()}`,
      meetingType: type,
      transcript: text,
      attendees
    })

    return NextResponse.json({ ok: true, transcript: text, sanityId: doc._id })
  } catch (err: any) {
    console.error(err)
    return new NextResponse(err?.message || 'Server error', { status: 500 })
  }
}
