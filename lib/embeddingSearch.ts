import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";
import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";
import pdf from "pdf-parse";

const PROJECT = process.env.GOOGLE_PROJECT_ID!;
const LOCATION = process.env.GOOGLE_LOCATION || "us-central1";
const INDEX_ENDPOINT_ID = process.env.VERTEX_INDEX_ENDPOINT_ID!;
const DEPLOYED_INDEX_ID = process.env.VERTEX_DEPLOYED_INDEX_ID!;

/**
 * Extract plain text from different file types
 */
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === ".pdf") {
    // Use pdf-parse to extract text from the buffer
    const data = await pdf(buffer);
    return data.text;
  }
  if (ext === ".docx") {
    // simple docx text extraction
    const text = buffer.toString("utf8");
    return text;
  }
  if (ext === ".pptx") {
    console.warn("PPTX parsing not implemented, skipping.");
    return "";
  }
  if (ext === ".xlsx") {
    const wb = xlsx.read(buffer, { type: "buffer" });
    return wb.SheetNames.map((name) =>
      xlsx.utils.sheet_to_csv(wb.Sheets[name])
    ).join("\n");
  }
  if (ext === ".vsdx") {
    return buffer.toString("utf8");
  }
  if (ext === ".txt") {
    return buffer.toString("utf8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Generate embeddings for a string using Vertex AI
 */
async function embedText(text: string): Promise<number[]> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/text-embedding-004:predict`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ content: text }],
    }),
  });

  type EmbeddingResponse = {
    predictions: {
      embeddings: { values: number[] };
    }[];
  };

  const json = (await res.json()) as EmbeddingResponse;

  if (!json.predictions?.[0]?.embeddings?.values) {
    throw new Error("No embedding returned from Vertex AI");
  }

  return json.predictions[0].embeddings.values;
}



/**
 * Store a new file into the Matching Engine index
 */
export async function storeInIndex(filePath: string) {
  const text = await extractText(filePath);

  // chunk text into smaller pieces (~500 tokens)
  const chunks = text.match(/.{1,1000}(\s|$)/g) || [];

  const datapoints = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vector = await embedText(chunk);
    datapoints.push({
      datapointId: `${path.basename(filePath)}-chunk${i}`,
      featureVector: vector,
      restricts: [{ namespace: "text", allow: [chunk] }],
    });
  }

  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}:upsertDatapoints`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deployedIndexId: DEPLOYED_INDEX_ID,
      datapoints,
    }),
  });

  const json = await res.json();
  console.log("Upsert response:", JSON.stringify(json, null, 2));
  return json;
}

/**
 * Search for similar docs in Matching Engine
 */
export async function embedAndSearch(query: string, neighborCount = 3) {
  const embedding = await embedText(query);

  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}:findNeighbors`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deployedIndexId: DEPLOYED_INDEX_ID,
      queries: [
        {
          datapoint: { datapointId: "query", featureVector: embedding },
          neighborCount,
        },
      ],
    }),
  });

  type FindNeighborsResponse = {
    nearestNeighbors: {
      neighbors: {
        datapoint: {
          datapointId: string;
          restricts?: { namespace: string; allow: string[] }[];
        };
        distance: number;
      }[];
    }[];
  };

  const json = (await res.json()) as FindNeighborsResponse;

  if (!json.nearestNeighbors?.length) return [];

  return json.nearestNeighbors[0].neighbors.map((n) => ({
    id: n.datapoint.datapointId,
    score: n.distance,
    text: n.datapoint.restricts?.[0]?.allow?.[0] || "(no text stored)",
  }));
}


