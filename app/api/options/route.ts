import { NextResponse } from "next/server"
import { client } from "@/lib/sanity.server"

export async function GET() {
  try {
    // Fetch meeting types
    const meetingTypes = await client.fetch(
      `*[_type == "meetingType"]{ _id, name } | order(name asc)`,
      {},
      { cache: "no-store" } // ✅ disable caching
    )

    // Fetch personas
    const personas = await client.fetch(
      `*[_type == "persona"]{ _id, name, role } | order(name asc)`,
      {},
      { cache: "no-store" } // ✅ disable caching
    )

    return NextResponse.json({
      meetingTypes,
      personas,
    })
  } catch (err: any) {
    console.error("Error in /api/options:", err)
    return new NextResponse("Failed to load options", { status: 500 })
  }
}
