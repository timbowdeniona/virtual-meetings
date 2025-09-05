import { NextResponse } from "next/server";
import { client } from "@/lib/sanity.server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PptxGenJS from "pptxgenjs";
import { Any } from "@sanity/client";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Generate PPTX from transcripts
export async function POST(req: Request) {
  try {
    const { meetingIds } = await req.json();

    if (!meetingIds?.length) {
      return NextResponse.json(
        { error: "No meetingIds provided" },
        { status: 400 }
      );
    }

    // 1. Fetch transcripts from Sanity
    const transcripts = await client.fetch(
      `*[_type == "transcript" && _id in $ids]{_id, transcript, meetingType}`,
      { ids: meetingIds }
    );

    if (!transcripts.length) {
      return NextResponse.json(
        { error: "No transcripts found" },
        { status: 404 }
      );
    }

    // 2. Summarize using Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: MODEL });

    const context = transcripts
      .map((t: any) => `## ${t.meetingType || "Meeting"}\n${t.transcript}`)
      .join("\n\n");

    const prompt = `You are generating a Discovery Proposal presentation.
Use the following meeting transcripts as context:

${context}

Please return a structured outline for slides in JSON format like:
[
  { "title": "Slide title", "bullets": ["point 1", "point 2"] }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let slides: { title: string; bullets: string[] }[] = [];
    try {
      slides = JSON.parse(text);
    } catch (e) {
      slides = [{ title: "Summary", bullets: [text] }];
    }

    // 3. Generate PPTX
    const pptx = new PptxGenJS();

    // 🔹 Cover slide
    const cover = pptx.addSlide();
    cover.addText("Discovery Proposal", {
      x: 0.5,
      y: 1.5,
      fontSize: 36,
      bold: true,
      color: "2E74B5",
    });
    cover.addText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 0.5,
      y: 3.0,
      fontSize: 18,
      color: "555555",
    });
    cover.addText("Virtual Meetings Assistant", {
      x: 0.5,
      y: 4.5,
      fontSize: 20,
      italic: true,
      color: "888888",
    });

    // 🔹 AI-generated slides
    slides.forEach((slide) => {
      const s = pptx.addSlide();
      s.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        bold: true,
        color: "000000",
      });
      slide.bullets?.forEach((b, i) => {
        s.addText(`• ${b}`, {
          x: 0.7,
          y: 1.2 + i * 0.6,
          fontSize: 16,
          color: "363636",
        });
      });
    });

    const raw = await pptx.write({ outputType: "nodebuffer" });

    // Explicitly assert it's a Uint8Array
    const u8 = raw as Uint8Array;

    const buffer = Buffer.from(u8);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="discovery-proposal.pptx"`,
      },
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
