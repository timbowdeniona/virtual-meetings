import { NextResponse } from "next/server";
import { client } from "@/lib/sanity.server";

export async function GET() {
  const transcripts = await client.fetch(
    `*[_type == "transcript"]{_id, meetingType->{name}} | order(_createdAt desc)[0..20]`
  );
  return NextResponse.json(transcripts);
}