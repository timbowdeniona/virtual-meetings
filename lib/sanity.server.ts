import { createClient } from '@sanity/client'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID as string
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'development'
export const apiVersion = '2025-08-01'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN
})
