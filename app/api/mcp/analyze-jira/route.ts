import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedAndSearch } from "@/lib/embeddingSearch"; // <-- your Vertex RAG utility

const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";

export async function POST(req: NextRequest) {
  try {
    const { jiraId } = await req.json();

    if (!jiraId) {
      return NextResponse.json({ error: "jiraId required" }, { status: 400 });
    }

    // 1. 🔹 Fetch Jira issue from your own API
    const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const jiraRes = await fetch(`${baseUrl}/api/jira/${jiraId}`);
    if (!jiraRes.ok) {
      throw new Error(`Failed to fetch Jira issue ${jiraId}`);
    }
    // 👇 assert type explicitly
    const jiraData = (await jiraRes.json()) as {
        id: string;
        summary: string;
        description: any;
    };

    // 2. 🔹 Embed & query Vertex RAG
    const ragResults = await embedAndSearch(
      jiraData.summary + "\n\n" + JSON.stringify(jiraData.description)
    );

    // 3. 🔹 Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `
You are an AI assistant helping engineers with Jira issues.

Jira Ticket:
${jiraData.id} - ${jiraData.summary}

Context:
${JSON.stringify(jiraData.description, null, 2)}

Relevant past transcripts & docs:
${ragResults.map((r: any) => r.text).join("\n\n")}

Please propose:
1. Code solution approaches (with tradeoffs).
2. Possible risks or dependencies.
3. Recommended next steps.
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();

    return NextResponse.json({ ok: true, jiraId, suggestions: text });
  } catch (err: any) {
    console.error("MCP Error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
