import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'knowledgeDoc',
  title: 'Knowledge Document',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'file', type: 'file' },
    { name: 'text', type: 'text' }, // extracted content
    { name: 'embedding', type: 'array', of: [{ type: 'number' }] }, // optional
  ]
})