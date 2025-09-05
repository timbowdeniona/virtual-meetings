// ./netlify/functions/ingest-vertex.ts
import { Handler } from "@netlify/functions";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import xlsx from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IndexServiceClient } from "@google-cloud/aiplatform";

const MODEL = "models/text-embedding-004";

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx") {
    const buffer = fs.readFileSync(filePath);
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (ext === ".xlsx") {
    const workbook = xlsx.readFile(filePath);
    return workbook.SheetNames.map((name) =>
      xlsx.utils.sheet_to_csv(workbook.Sheets[name])
    ).join("\n");
  }

  console.warn(`⚠️ Unsupported file type: ${ext}, skipping.`);
  return "";
}

async function embedText(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: MODEL });

  const result = await model.embedContent({
    content: {
      role: "user",
      parts: [{ text }],
    },
  });

  return result.embedding?.values || [];
}

async function upsertToVertex(docId: string, embedding: number[]) {
  const client = new IndexServiceClient({
    projectId: process.env.GCLOUD_PROJECT,
    location: process.env.GCLOUD_LOCATION || "us-central1",
  });

  const indexName = `projects/${process.env.GCLOUD_PROJECT}/locations/${process.env.GCLOUD_LOCATION || "us-central1"}/indexes/${process.env.VERTEX_INDEX_ID}`;

  await client.upsertDatapoints({
    index: indexName,
    datapoints: [
      {
        datapointId: docId,
        featureVector: embedding,
      },
    ],
  });
}

export const handler: Handler = async (event) => {
  try {
    const filePath = event.queryStringParameters?.file;
    if (!filePath) {
      return {
        statusCode: 400,
        body: "Missing ?file= parameter",
      };
    }

    console.log(`📂 Ingesting file: ${filePath}`);

    const text = await extractText(filePath);
    if (!text.trim()) {
      return {
        statusCode: 400,
        body: "No text extracted from file",
      };
    }

    const embedding = await embedText(text);
    await upsertToVertex(path.basename(filePath), embedding);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, file: filePath }),
    };
  } catch (err: any) {
    console.error("❌ Ingest error:", err);
    return {
      statusCode: 500,
      body: err.message || "Server error",
    };
  }
};
