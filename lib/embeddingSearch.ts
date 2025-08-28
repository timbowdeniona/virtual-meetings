import { createClient } from '@sanity/client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import * as unzipper from 'unzipper'
import { parseStringPromise } from 'xml2js'
import fs from 'fs'

// --- Sanity client ---
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'development',
  apiVersion: '2025-08-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

// --- Gemini embeddings client ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

// --- Helper: document parsers ---
async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer })
  return value
}

function extractXlsx(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  let text = ''
  wb.SheetNames.forEach((sheet) => {
    const rows = XLSX.utils.sheet_to_csv(wb.Sheets[sheet])
    text += `\n\n[Sheet: ${sheet}]\n${rows}`
  })
  return text
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const directory = await unzipper.Open.buffer(buffer)
  let text = ''
  for (const file of directory.files) {
    if (file.path.includes('ppt/slides/slide')) {
      const content = await file.buffer()
      const parsed = await parseStringPromise(content.toString())
      const xml = JSON.stringify(parsed)
      text += xml.match(/<a:t>(.*?)<\/a:t>/g)?.map((s) =>
        s.replace(/<\/?a:t>/g, '')
      ).join(' ') || ''
    }
  }
  return text
}

// --- Fetch all docs with embeddings ---
async function fetchEmbeddables() {
  return await client.fetch(`*[
    (_type == "knowledgeDoc" || _type == "transcript") && defined(embedding)
  ]{ _id, _type, title, transcript, text, embedding }`)
}

// --- Compute embedding for a query ---
async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values as number[]
}

// --- Cosine similarity (to rank results) ---
function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0))
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0))
  return dot / (normA * normB)
}

// --- Original Export (kept intact): semanticSearch ---
export async function semanticSearch(queryEmbedding: number[], k = 3) {
  const docs = await fetchEmbeddables()
  const scored = docs.map((d: any) => {
    const emb: number[] = d.embedding
    const score = cosineSim(queryEmbedding, emb)
    return { ...d, score }
  })
  return scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score).slice(0, k)
}

// --- New helper export to embed queries (optional) ---
export async function getQueryEmbedding(query: string) {
  return await embedText(query)
}

// --- New helper to extract text from office docs (optional) ---
export async function extractOfficeText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  if (filePath.endsWith('.docx')) return await extractDocx(buffer)
  if (filePath.endsWith('.xlsx')) return extractXlsx(buffer)
  if (filePath.endsWith('.pptx')) return await extractPptx(buffer)
  throw new Error('Unsupported file type')
}

// --- formatKnowledge (from embeddingSearch_new) ---
export function formatKnowledge(results: any[]): string {
  return results.map(r => {
    const content = r.text || r.transcript || ''
    const snippet = content.length > 300 ? content.slice(0, 300) + '...' : content
    return `• ${r.title || r._id}\n${snippet}\n`
  }).join('\n')
}
