import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'transcript',
  title: 'Transcript',
  type: 'document',
  fields: [
    defineField({ name: 'meetingId', title: 'Meeting ID', type: 'string', description: 'e.g., meeting.<id>' }),
    defineField({ name: 'meetingType', title: 'Meeting Type', type: 'string' }),
    defineField({ name: 'transcript', title: 'Transcript', type: 'text', rows: 24 }),
    defineField({
      name: 'attendees',
      title: 'Attendees',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'persona' }] }]
    }),
  ]
})
