'use client'

import { useEffect, useState } from 'react'

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
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load meetingTypes + personas from Sanity API routes
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

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold mb-2">Run a Meeting</h1>
        <p className="text-sm text-gray-400 mb-6">
          Provide meeting details and select meeting type & attendees.
        </p>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Meeting name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

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

          <textarea
            className="input min-h-24"
            placeholder="Instructions / Jira story"
            value={form.instructions}
            onChange={e =>
              setForm({ ...form, instructions: e.target.value })
            }
          />
          <input
            className="input"
            placeholder="Goal (optional)"
            value={form.goal}
            onChange={e => setForm({ ...form, goal: e.target.value })}
          />

          {/* Attendees multi-select checkboxes */}
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
      {result && <pre className="card p-4 whitespace-pre-wrap">{result}</pre>}
    </div>
  )
}
