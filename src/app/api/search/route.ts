
import { NextResponse } from "next/server";
import { z } from "zod";
import { embedQuery } from "@/lib/embeddings";
import { readChunks } from "@/lib/store";

// export const runtime = "nodejs";

const schema = z.object({
  question: z.string().trim().min(1).max(2000),
  topK: z.number().int().min(1).max(10).optional(),
});

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide a question and an optional topK between 1 and 10." },
        { status: 400 }
      );
    }

    const { question, topK = 3 } = parsed.data;

    // Read previously stored document vectors.
    const storedChunks = await readChunks();

    if (storedChunks.length === 0) {
      return NextResponse.json(
        { error: "No documents have been ingested yet. Call /api/ingest first." },
        { status: 404 }
      );
    }

    // Embed only the user's query. Do not re-embed every document.
    const queryVector = await embedQuery(question);

    const results = storedChunks
      .map((chunk) => ({
        id: chunk.id,
        filename: chunk.filename,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score: cosineSimilarity(queryVector, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return NextResponse.json({
      question,
      totalDocumentsChunks: storedChunks.length,
      results,
    });
  } catch (error) {
    console.error("Semantic search failed:", error);

    return NextResponse.json(
      { error: "Search failed. Check the local Ollama service and stored data." },
      { status: 500 }
    );
  }
}
