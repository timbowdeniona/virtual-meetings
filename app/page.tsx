'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import ReactMarkdown from 'react-markdown'


// 🔹 Dynamically import ReactQuill (client-side only)
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function HomePage() {
  const [form, setForm] = useState({
    name: '',
    meetingType: '',
    instructions: '',
    goal: '',
    attendees: [] as string[],
  })
  const [meetingTypes, setMeetingTypes] = useState<any[]>([])
  const [personas, setPersonas] = useState<any[]>([])
  const [jiraId, setJiraId] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/options')
        const data = await res.json()
        setMeetingTypes(data.meetingTypes || [])
        setPersonas(data.personas || [])
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/run-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          meetingType: form.meetingType,
          instructions: form.instructions,
          goal: form.goal,
          attendeeIds: form.attendees,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data.transcript)
    } catch (err: any) {
      setError(err.message || 'Failed to run meeting')
    } finally {
      setRunning(false)
    }
  }

  const toggleAttendee = (id: string) => {
    setForm(prev => ({
      ...prev,
      attendees: prev.attendees.includes(id)
        ? prev.attendees.filter(x => x !== id)
        : [...prev.attendees, id],
    }))
  }

  // Jira description parser (still gives clean text, but we’ll store in Quill)
  const parseJiraDescription = (desc: any): string => {
    if (!desc || !desc.content) return ''
    const lines: string[] = []
    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.type === 'text' && node.text) lines.push(node.text)
        if (node.type === 'paragraph') {
          if (node.content) walk(node.content)
          lines.push('<br/>')
        }
        if (node.type === 'heading') {
          lines.push(`<h${node.attrs.level}>${(node.content || []).map((c: any) => c.text).join(' ')}</h${node.attrs.level}>`)
        }
        if (node.type === 'bulletList' && node.content) {
          node.content.forEach((li: any) => {
            const text = (li.content || [])
              .map((n: any) => (n.content || []).map((c: any) => c.text || '').join(' '))
              .join(' ')
            lines.push(`<li>${text}</li>`)
          })
        }
        if (node.content) walk(node.content)
      }
    }
    walk(desc.content)
    return lines.join(' ')
  }

  const fetchJira = async () => {
    if (!jiraId) return
    try {
      const res = await fetch(`/api/jira/${jiraId}`)
      if (!res.ok) throw new Error(await res.text())
      const issue = await res.json()
      const parsed = `
        <p><strong>Jira Issue:</strong> ${issue.id}</p>
        <p><strong>Summary:</strong> ${issue.summary}</p>
        <div>${parseJiraDescription(issue.description)}</div>
      `
      setForm(prev => ({ ...prev, instructions: parsed }))
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Jira issue')
    }
  }

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold mb-2">Run a Meeting</h1>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Meeting name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          {/* Jira ID fetcher */}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Jira ID (e.g., AP-244)"
              value={jiraId}
              onChange={e => setJiraId(e.target.value)}
            />
            <button type="button" className="btn" onClick={fetchJira}>
              Fetch from Jira
            </button>
          </div>

          {/* Meeting Type dropdown */}
          <select
            className="input"
            value={form.meetingType}
            onChange={e => setForm({ ...form, meetingType: e.target.value })}
          >
            <option value="">Select Meeting Type…</option>
            {meetingTypes.map(mt => (
              <option key={mt._id} value={mt._id}>
                {mt.name}
              </option>
            ))}
          </select>

          {/* Rich Text Editor for instructions */}
          <div>
            <p className="text-sm text-gray-400 mb-1">Instructions / Jira story</p>
            <ReactQuill
              theme="snow"
              value={form.instructions}
              onChange={(val) => setForm({ ...form, instructions: val })}
              className="bg-slate-900 text-white rounded-xl"
            />
          </div>

          <input
            className="input"
            placeholder="Goal (optional)"
            value={form.goal}
            onChange={e => setForm({ ...form, goal: e.target.value })}
          />

          {/* Attendees multi-select */}
          <div className="card p-4">
            <p className="mb-2 text-sm text-gray-400">Select Attendees</p>
            <div className="grid gap-2">
              {personas.map(p => (
                <label key={p._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.attendees.includes(p._id)}
                    onChange={() => toggleAttendee(p._id)}
                  />
                  <span>{p.name} ({p.role})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn" disabled={running} type="submit">
              {running ? 'Running…' : 'Run meeting'}
            </button>
            <a className="btn" href="/studio" target="_blank" rel="noreferrer">
              Open Sanity Studio
            </a>
          </div>
        </form>
      </section>

      {error && <div className="card p-4 text-red-300">{error}</div>}
      {result && (
        <div className="card p-4 prose prose-invert max-w-none">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
