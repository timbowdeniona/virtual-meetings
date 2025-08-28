import { Handler } from '@netlify/functions'
import { createClient } from '@sanity/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 🔹 Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'development',
  apiVersion: '2025-08-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

// 🔹 Gemini embeddings client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' }) // Gemini embedding model

// 🔹 Simple text extractor (stub for PDF/DOC parsing)
async function extractTextFromFile(fileAssetId: string): Promise<string> {
  // TODO: download from Sanity CDN + parse if PDF/DOC
  // For now just return placeholder
  return `File text for ${fileAssetId} (parsing not yet implemented)`
}

const handler: Handler = async () => {
  try {
    // 1. Fetch all knowledgeDocs + transcripts missing embeddings
    const docs: any[] = await client.fetch(`
      *[
        (_type == "knowledgeDoc" || _type == "transcript") && !defined(embedding)
      ]{ _id, _type, title, text, transcript, file }
    `)

    if (!docs.length) {
      return { statusCode: 200, body: 'No docs to embed ✅' }
    }

    // 2. Process each doc
    for (const doc of docs) {
      let text = ''

      if (doc._type === 'knowledgeDoc') {
        if (doc.text) {
          text = doc.text
        } else if (doc.file?.asset?._ref) {
          text = await extractTextFromFile(doc.file.asset._ref)
        }
      } else if (doc._type === 'transcript') {
        text = doc.transcript || ''
      }

      if (!text.trim()) continue

      // 3. Generate embedding
      const result = await embeddingModel.embedContent(text)
      const vector = result.embedding.values

      // 4. Save embedding back to Sanity
      await client
        .patch(doc._id)
        .set({ embedding: vector })
        .commit()
    }

    return { statusCode: 200, body: `Embedded ${docs.length} docs ✅` }
  } catch (err: any) {
    console.error(err)
    return { statusCode: 500, body: err.message || 'Error embedding docs' }
  }
}

export { handler }
