import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'meeting',
  title: 'Meeting',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Meeting Type',
      type: 'reference',
      to: [{ type: 'meetingType' }],
      validation: Rule => Rule.required(),
      description: 'Select from predefined meeting types (e.g. Three Amigos, Stand Up, Review).'
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 6,
      description: 'Specific story or meeting context. Overrides the default instructions from the Meeting Type.'
    }),
    defineField({
      name: 'goal',
      title: 'Goal',
      type: 'string',
      description: 'Meeting-specific goal. Overrides the default goal from the Meeting Type.'
    }),
  ],
})
