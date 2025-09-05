import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { client } from "@/lib/sanity.server";
import { embedAndSearch } from "@/lib/embeddingSearch"; // ✅ your Vertex AI helper

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    const { name, meetingType, instructions, goal, attendeeIds } = await req.json();

    // 🔹 Fetch meetingType
    let mtDoc: any = null;
    if (meetingType) {
      mtDoc = await client.fetch(
        `*[_type == "meetingType" && _id == $id][0]{_id, name, defaultGoal, defaultInstructions, generationTemplate}`,
        { id: meetingType }
      );
    }

    // 🔹 Merge defaults + user inputs
    const effectiveGoal = [mtDoc?.defaultGoal, goal].filter(Boolean).join(" — ");
    const effectiveInstructions = [mtDoc?.defaultInstructions, instructions]
      .filter(Boolean)
      .join("\n\n");

    // 🔹 Fetch personas
    let personas: any[] = [];
    if (attendeeIds?.length) {
      personas = await client.fetch(
        `*[_type == "persona" && _id in $ids]{_id, name, systemInstruction, role}`,
        { ids: attendeeIds }
      );
    }

    const systemBits = personas
      .map((p: any) => `- ${p.name} (${p.role}): ${p.systemInstruction}`)
      .join("\n");

    // 🔹 Query relevant knowledge (Vertex AI index)
    const kbResults = await embedAndSearch(
      effectiveInstructions || effectiveGoal || "general meeting",
      3 // top K results
    );

    const knowledgeSnippets = kbResults
      .map((r: any, i: number) => `Doc ${i + 1} (score: ${r.score}):\n${r.text}`)
      .join("\n\n");

    // 🔹 Build Gemini prompt
    const prompt = `You are facilitating a ${mtDoc?.name || "meeting"}.
Goal: ${effectiveGoal || "Refine the story and produce clear outcomes."}

Participants:
${systemBits || "- (none provided, assume PO/Dev/QA roles)"}

User story / context:
${effectiveInstructions || "(no additional context provided)"}

Relevant knowledge base docs:
${knowledgeSnippets || "(no relevant docs found)"}

Please generate:
${mtDoc?.generationTemplate || `1) Transcript (~12-20 turns, concise).
2) 5-8 Gherkin acceptance criteria.
3) 3-5 follow-up actions.`}
`;

    // 🔹 Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: MODEL });
    const res = await model.generateContent(prompt);
    const text = res.response.text();

    // 🔹 Save transcript in Sanity
    const attendees = personas.map((p: any) => ({
      _type: "reference",
      _ref: p._id,
    }));

    const doc = await client.create({
      _type: "transcript",
      meetingId: name || `meeting.${Date.now()}`,
      meetingType: mtDoc?._id || meetingType || "unknown",
      transcript: text,
      attendees,
      knowledgeRefs: kbResults.map((r: any) => r.id), // optional
    });

    return NextResponse.json({
      ok: true,
      transcript: text,
      sanityId: doc._id,
      knowledgeUsed: kbResults, // ✅ expose retrieved docs
    });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message || "Server error", { status: 500 });
  }
}
