import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { client } from "../lib/sanity.server"

const BUCKET = "gs://timberyard-ai-bucket"
const OUTPUT = "./data/training.jsonl"
const DOCS_FOLDER = "./data/files/TrainingDocs"

console.log("🚀 Starting exportAndUpload...");


async function run() {
  console.log("🔹 Exporting transcripts from Sanity...")

//   const transcripts = await client.fetch(`
//     *[_type == "transcript"]{
//       transcript,
//       "attendees": attendees[]->name,
//       "meetingType": meetingType->name,
//       "goal": coalesce(goal, ""),
//       "instructions": coalesce(instructions, ""),
//       "files": associatedFiles[]{name, content}
//     }
//   `)

//   const lines: string[] = []

//   transcripts.forEach((t: any) => {
//     const context = `
// Meeting Type: ${t.meetingType}
// Attendees: ${t.attendees?.join(", ") || "N/A"}
// Goal: ${t.goal}
// Instructions: ${t.instructions}
// Attached Files: ${t.files?.map((f: any) => f.name).join(", ") || "None"}
//     `.trim()

//     lines.push(JSON.stringify({
//       input: context,
//       output: t.transcript,
//     }))
//   })

  // Ensure ./data exists
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })

  //fs.writeFileSync(OUTPUT, lines.join("\n"), "utf8")
  //console.log(`✅ Exported ${lines.length} transcripts to ${OUTPUT}`)

  // Upload JSONL to GCS
  console.log(`🔹 Uploading ${OUTPUT} to ${BUCKET}...`)
  execSync(`gsutil cp ${OUTPUT} ${BUCKET}/`, { stdio: "inherit" })

  // Upload all training docs
  if (fs.existsSync(DOCS_FOLDER)) {
    console.log(`🔹 Uploading files from ${DOCS_FOLDER} to ${BUCKET}/TrainingDocs/ ...`)
    execSync(`gsutil cp -r ${DOCS_FOLDER}/* ${BUCKET}/TrainingDocs/`, { stdio: "inherit" })
  } else {
    console.warn(`⚠️ Folder ${DOCS_FOLDER} does not exist, skipping docs upload.`)
  }

  console.log("🎉 All done!")
}

run().catch((err) => {
  console.error("❌ Error exporting/uploading:", err)
  process.exit(1)
})
