# VIRTUAL MEETINGS — Gemini + Next.js Scaffold

Spin up virtual meetings among personas (Developer, QA Tester, Product Owner, Project Manager — or your own custom "gems") to refine Jira user stories and produce acceptance criteria, run planning poker sessions, backlog refinement etc..

## Features
- Next.js (App Router) + TypeScript
- Server-side call to Gemini via the **Google Gen AI SDK (`@google/genai`)**
- Preset personas for Dev/QA/PO/PM stored as documents in sanity; add any number of custom participants
- Generates a realistic, concise meeting transcript + Gherkin AC + actions
- Sanity persistent backend for Personas, Meetings and Transcripts. Personas have id, name, systemInstructions etc. to mimic Google Gems

---

## 1) Prerequisites
- Node.js 18+
- A Gemini API key from **Google AI Studio**.

### Get your Gemini API key
1. Visit **Google AI Studio** and create a key: https://aistudio.google.com/app/apikey  
2. Copy `.env.example` to `.env` and set your key:
   ```bash
   cp .env.example .env
   # paste your key
   ```

> Tip: By default we use `gemini-2.5-flash`. You can switch to `gemini-2.5-pro` by changing `GEMINI_MODEL` in `.env`.

---

## 2) Run the app
```bash
npm i
npm run dev
# open http://localhost:3000
```

---

## 3) How it works
- The API route **`/api/run-meeting`** builds a focused facilitation prompt using:
  - Each participant’s system instructions (preset or custom)
  - Your Jira story and optional goals
- It calls the Gemini model via the **Google Gen AI SDK** and returns a transcript.
- Meetings are stored as Transcripts in Sanity.

**Key files**
- `lib/gemini.ts` – initializes the SDK using `GOOGLE_API_KEY`
- `components/personaPresets.ts` – built-in Three Amigos personas
- `components/MeetingForm.tsx` – create a meeting and run it
- `app/api/run-meeting/route.ts` – server endpoint that calls Gemini

---

## 4) Extending for other meeting types
- Add new persona presets or meetingt templates in Sanity
- Add form fields for agenda/inputs and incorporate them into the prompt
- Swap the in-memory store for your DB of choice (e.g., Prisma + Postgres)
- Consider streaming responses for live typing UX

---

## 5) Notes on "Gems"
Google's consumer “Gems” product is a way to save custom instructions in Gemini. In the public developer API you achieve the same effect by passing **system instructions** per participant — exactly what this scaffold does. If/when a direct “Gems API” becomes available for programmatic selection of your saved Gems, you can map those to participants here.

---

## 6) Security
- Keep your API key on the server (never expose it to the browser).
- Consider rate limiting and auth before exposing this to a team.

---

## 7) Troubleshooting
- **`GOOGLE_API_KEY is not set`** → create `.env` with your key.
- **Model errors** → try switching model (e.g., `gemini-2.5-pro`) in `.env`.
- Node <18 → upgrade Node.

---

## License
MIT


---

## Project notes (generated)
- Tailwind is configured with dark theme (`dark` class on `<html>`).
- Sanity Studio is embedded at **/studio**.
- Schemas included: **persona**, **meeting**, **transcript**.
- `POST /api/run-meeting` calls Gemini and writes a Transcript to Sanity.
- Create Personas in Studio. If you want custom _id like `persona.dev`, create via script or API with `_id` set. In Studio, you can also duplicate and change ID via the document actions.

### Quickstart
```bash
cp .env.example .env
# Fill in GOOGLE_API_KEY, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
npm i
npm run dev
# open http://localhost:3000 and http://localhost:3000/studio
```

flowchart TD
    subgraph Client["🖥️ Client (Browser)"]
        UI["Homepage UI\n• Meeting type dropdown\n• Personas selector\n• Attach files"]
        Studio["Sanity Studio (embedded)"]
    end

    subgraph Netlify["⚡ Next.js App (Netlify)"]
        RunMeeting["/api/run-meeting\nMerges defaults + user input\n→ Gemini"]
        JiraAPI["/api/jira/[id]\nFetch + parse Jira issue"]
        Ingest["/api/ingest-knowledge\nEmbed & upsert docs"]
        Search["/lib/embeddingSearch.ts\nextract → embed → search/upsert"]
    end

    subgraph Sanity["📦 Sanity (CMS)"]
        Schemas["Schemas\npersona / meetingType / transcript / fileRef"]
        Content["Content\nPersonas, Meeting Types, Transcripts"]
    end

    subgraph GCP["☁️ Google Cloud (ai-training-470511)"]
        Gemini["Vertex AI — Gemini\ntext-embedding-004, generative models"]
        Index["Matching Engine Vector Search\nIndex + Endpoint deployed"]
        GCS["Cloud Storage\nBucket: timberyard-ai-bucket"]
    end

    subgraph External["🌐 External Services"]
        Jira["Jira Cloud API"]
        Fireflies["Fireflies.ai (optional)\nWebhook transcripts"]
        Files["User Files\n.pdf .docx .pptx .xlsx .txt"]
        Outputs["Outputs\nTranscripts, Acceptance Criteria,\n.pptx decks (planned)"]
    end

    %% Edges
    UI -->|Form submit| RunMeeting
    Studio -->|Manage content| Schemas
    RunMeeting -->|Fetch defaults| Schemas
    RunMeeting -->|Fetch personas| Content
    RunMeeting -->|Calls| Gemini
    RunMeeting -->|Vector search| Index
    RunMeeting -->|Save transcript| Content
    JiraAPI --> Jira
    Ingest --> Search
    Search --> Gemini
    Search --> Index
    Ingest --> GCS
    Files --> Ingest
    Files --> RunMeeting
    Fireflies --> Content
    Content --> Outputs
Nop
