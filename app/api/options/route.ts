import { NextResponse } from 'next/server'
import { client } from '@/lib/sanity.server'

export async function GET() {
  try {
    const meetingTypes = await client.fetch(
      `*[_type == "meetingType"]{_id, name}`
    )
    const personas = await client.fetch(
      `*[_type == "persona"]{_id, name, role}`
    )
    return NextResponse.json({ meetingTypes, personas })
  } catch (err: any) {
    return new NextResponse(err.message || 'Error fetching options', { status: 500 })
  }
}
