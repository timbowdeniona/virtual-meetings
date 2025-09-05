"use client";

import { useState, useEffect } from "react";

export default function DocsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);

  // Fetch existing docs
  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/docs/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("File uploaded and ingested successfully!");
      setFile(null);
      // Refresh list
      const docs = await fetch("/api/docs").then((r) => r.json());
      setDocs(docs);
    } else {
      alert("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Knowledge Base Documents</h1>

      {/* Upload form */}
      <div className="space-y-2">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-600 file:text-white
                     hover:file:bg-indigo-700"
        />
        <button
          disabled={!file || uploading}
          onClick={handleUpload}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition"
        >
          {uploading ? "Uploading..." : "Upload + Train"}
        </button>
      </div>

      {/* List of docs */}
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Uploaded Docs</h2>
        <ul className="list-disc pl-5 space-y-1">
          {docs.length > 0 ? (
            docs.map((d) => (
              <li key={d.id}>
                {d.name} — <span className="text-gray-400">{d.status}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-400">No documents uploaded yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}