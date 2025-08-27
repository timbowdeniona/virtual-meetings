import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'meetingType',
  title: 'Meeting Type',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'defaultGoal',
      title: 'Default Goal',
      type: 'string',
      description: 'Default purpose or expected outcome of this meeting type',
    }),
    defineField({
      name: 'defaultInstructions',
      title: 'Default Instructions',
      type: 'text',
      rows: 6,
      description: 'Guidance or system prompt to steer the discussion for this meeting type',
    }),
    defineField({
      name: 'generationTemplate',
      title: 'Generation Template',
      type: 'text',
      rows: 8,
      description:
        'The instruction block appended after "Please generate:". Example: "1) A realistic transcript ... 2) Acceptance criteria ... 3) Actions."',
    }),
  ],
})
