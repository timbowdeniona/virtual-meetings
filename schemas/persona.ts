import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'persona',
  title: 'Persona',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'systemInstruction',
      title: 'System Instruction',
      type: 'text',
      rows: 5,
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      options: {
        list: [
          { title: 'Developer', value: 'Developer' },
          { title: 'QA Tester', value: 'QA Tester' },
          { title: 'Product Owner', value: 'Product Owner' },
          { title: 'Project Manager', value: 'Project Manager' },
          { title: 'Other', value: 'Other' },
        ]
      }
    }),
    defineField({
      name: 'associatedFiles',
      title: 'Associated Files',
      type: 'array',
      of: [{ type: 'file' }]
    })
  ]
})
