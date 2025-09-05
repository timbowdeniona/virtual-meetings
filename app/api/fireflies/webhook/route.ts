import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity.server";
import { storeInIndex } from "@/lib/embeddingSearch";
import fs from "fs";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.FIREFLIES_WEBHOOK_SECRET!;

function verifySignature(rawBody: string, signature: string) {
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");
  return digest === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-fireflies-signature") || "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    const { meeting_id, meeting_title, participants, transcript } = body;

    if (!transcript) {
      return NextResponse.json({ error: "No transcript" }, { status: 400 });
    }

    // Save transcript into Sanity
    const doc = await client.create({
      _type: "transcript",
      meetingId: `fireflies.${meeting_id}`,
      meetingType: "fireflies",
      transcript,
      attendees: participants?.map((p: any) => ({
        _type: "person",
        name: p.name,
        email: p.email,
      })),
    });

    // Save transcript into Vertex AI
    const tmpFile = `/tmp/${meeting_id}.txt`;
    await fs.promises.writeFile(tmpFile, transcript, "utf8");
    await storeInIndex(tmpFile);

    return NextResponse.json({ ok: true, sanityId: doc._id });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
