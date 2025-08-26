import { GoogleGenerativeAI } from '@google/generative-ai'

export function getGemini() {
  const key = process.env.GOOGLE_API_KEY
  if (!key) throw new Error('GOOGLE_API_KEY not set')
  return new GoogleGenerativeAI(key)
}
