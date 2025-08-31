import { Handler } from "@netlify/functions"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { client } from "../../lib/sanity.server"

const BUCKET = "gs://timberyard-ai-bucket"
const OUTPUT = "/tmp/training.jsonl" // must use /tmp in Netlify functions
const DOCS_FOLDER = "./data/files/TrainingDocs"

export const handler: Handler = async () => {
  try {
    console.log("🚀 Starting export/upload...")

    // Fetch transcripts
    const transcripts = await client.fetch(`
      *[_type == "transcript"]{
        transcript,
        "attendees": attendees[]->name,
        "meetingType": meetingType->name,
        "goal": coalesce(goal, ""),
        "instructions": coalesce(instructions, ""),
        "files": associatedFiles[]{name, content}
      }
    `)

    const lines: string[] = transcripts.map((t: any) => {
      const context = `
Meeting Type: ${t.meetingType}
Attendees: ${t.attendees?.join(", ") || "N/A"}
Goal: ${t.goal}
Instructions: ${t.instructions}
Attached Files: ${t.files?.map((f: any) => f.name).join(", ") || "None"}
      `.trim()

      return JSON.stringify({
        input: context,
        output: t.transcript,
      })
    })

    fs.writeFileSync(OUTPUT, lines.join("\n"), "utf8")
    console.log(`✅ Exported ${lines.length} transcripts to ${OUTPUT}`)

    // Upload transcript JSONL
    execSync(`gsutil cp ${OUTPUT} ${BUCKET}/`, { stdio: "inherit" })

    // Upload docs if available
    if (fs.existsSync(DOCS_FOLDER)) {
      execSync(`gsutil cp -r ${DOCS_FOLDER}/* ${BUCKET}/TrainingDocs/`, { stdio: "inherit" })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        transcripts: transcripts.length,
        bucket: BUCKET,
      }),
    }
  } catch (err: any) {
    console.error("❌ Error:", err)
    return { statusCode: 500, body: err.message }
  }
}
