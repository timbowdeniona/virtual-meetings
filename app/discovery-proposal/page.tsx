"use client";

import { useState, useEffect } from "react";

export default function DiscoveryProposalPage() {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch recent transcripts from API
    fetch("/api/transcripts")
      .then((res) => res.json())
      .then((data) => setTranscripts(data));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-discovery-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingIds: selected }),
      });

      if (!res.ok) throw new Error("Proposal generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discovery-proposal-${Date.now()}.pptx`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("Something went wrong while generating the proposal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Generate Discovery Proposal</h1>

      <p className="text-gray-400">
        Select one or more past meeting transcripts to include in your
        Discovery Proposal.
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-800 rounded-lg p-3">
        {transcripts.map((t) => (
          <label
            key={t._id}
            className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(t._id)}
              onChange={() => toggle(t._id)}
              className="accent-indigo-600"
            />
            <span>
              {t.meetingType?.name || "Meeting"} —{" "}
              <span className="text-gray-500">{t._id}</span>
            </span>
          </label>
        ))}
        {transcripts.length === 0 && (
          <p className="text-gray-500 italic">No transcripts found.</p>
        )}
      </div>

      <button
        disabled={!selected.length || loading}
        onClick={generate}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition"
      >
        {loading ? "Generating..." : "Generate Proposal (.pptx)"}
      </button>
    </div>
  );
}
