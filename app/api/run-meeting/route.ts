import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { client } from '@/lib/sanity.server'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export async function POST(req: NextRequest) {
  try {
    const { name, meetingType, instructions, goal, attendeeIds, files } = await req.json()

    // 🔹 Fetch meetingType (if provided)
    let mtDoc: any = null
    if (meetingType) {
      mtDoc = await client.fetch(
        `*[_type == "meetingType" && _id == $id][0]{_id, name, defaultGoal, defaultInstructions, generationTemplate}`,
        { id: meetingType }
      )
    }

    // 🔹 Merge defaults + user inputs
    const effectiveGoal = [mtDoc?.defaultGoal, goal].filter(Boolean).join(' — ')
    const effectiveInstructions = [mtDoc?.defaultInstructions, instructions].filter(Boolean).join('\n\n')

    // 🔹 Fetch personas (attendees)
    let personas: any[] = []
    if (attendeeIds?.length) {
      personas = await client.fetch(
        `*[_type == "persona" && _id in $ids]{_id, name, systemInstruction, role}`,
        { ids: attendeeIds }
      )
    }

    const systemBits = personas
      .map((p: any) => `- ${p.name} (${p.role}): ${p.systemInstruction}`)
      .join('\n')

    // 🔹 Handle attached files (txt only, already parsed client-side)
    let fileContent = ''
    if (files?.length) {
      fileContent = files
        .map((f: any) => `\n[Attached file: ${f.name}]\n${f.content}`)
        .join('\n\n')
    }

    const prompt = `You are facilitating a ${mtDoc?.name || 'meeting'}.
Goal: ${effectiveGoal || 'Refine the story and produce clear outcomes.'}

Participants (with system instructions):
${systemBits || '- (none provided, assume PO/Dev/QA roles)'}

Jira/user story / context:
${effectiveInstructions || '(no additional context provided)'}

Attached documents (drafts, notes, or supporting files):
${fileContent || '(no files attached)'}

Please generate:
${mtDoc?.generationTemplate || `1) A realistic, concise transcript of the discussion (~12-20 turns, short lines).
2) 5-8 Gherkin-style acceptance criteria.
3) 3-5 follow-up actions.`}`

    // 🔹 Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: MODEL })
    const res = await model.generateContent(prompt)
    const text = res.response.text()

    // 🔹 Save transcript in Sanity
    const attendees = personas.map((p: any) => ({
      _type: 'reference',
      _ref: p._id,
    }))

    const doc = await client.create({
      _type: 'transcript',
      meetingId: name || `meeting.${Date.now()}`,
      meetingType: mtDoc?._id || meetingType || 'unknown',
      transcript: text,
      attendees,
    })

    return NextResponse.json({
      ok: true,
      transcript: text,
      sanityId: doc._id,
    })
  } catch (err: any) {
    console.error(err)
    return new NextResponse(err?.message || 'Server error', { status: 500 })
  }
}
