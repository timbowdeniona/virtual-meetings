import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { client } from '@/lib/sanity.server'
import { semanticSearch, formatKnowledge } from '@/lib/embeddingSearch'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export async function POST(req: NextRequest) {
  try {
    const { name, meetingType, instructions, goal, attendeeIds } = await req.json()

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

    // 🔹 Build query text for embedding search
    const queryText = `${effectiveGoal}\n\n${effectiveInstructions}`

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

    const queryEmbedding = (await embeddingModel.embedContent(queryText)).embedding.values

    // 🔹 Retrieve relevant knowledge from Sanity
    const relevantDocs = await semanticSearch(queryEmbedding, 3)
    const knowledgeContext = formatKnowledge(relevantDocs)

    // 🔹 Construct final prompt
    const prompt = `You are facilitating a ${mtDoc?.name || 'meeting'}.
Goal: ${effectiveGoal || 'Refine the story and produce clear outcomes.'}

Participants (with system instructions):
${systemBits || '- (none provided, assume PO/Dev/QA roles)'}

Context from prior knowledge:
${knowledgeContext || '(no relevant knowledge found)'}

Jira/user story / context:
${effectiveInstructions || '(no additional context provided)'}

Please generate:
${mtDoc?.generationTemplate || `1) A realistic, concise transcript of the discussion (~12-20 turns, short lines).
2) 5-8 Gherkin-style acceptance criteria.
3) 3-5 follow-up actions.`}`

    // 🔹 Call Gemini
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
      embedding: queryEmbedding, // optional: store the query embedding for traceability
    })

    return NextResponse.json({
      ok: true,
      transcript: text,
      sanityId: doc._id,
      usedKnowledge: relevantDocs.map((d: { _id: any; score: any }) => ({ id: d._id, score: d.score })),
    })
  } catch (err: any) {
    console.error(err)
    return new NextResponse(err?.message || 'Server error', { status: 500 })
  }
}
