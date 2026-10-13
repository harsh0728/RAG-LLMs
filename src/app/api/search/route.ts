
import { NextResponse } from "next/server";
import { z } from "zod";
import { retrieveChunks } from "@/lib/retrieval";

// export const runtime = "nodejs";

const schema = z.object({
  question: z.string().trim().min(1).max(2000),
  topK: z.number().int().min(1).max(10).optional(),
});

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
    const { totalChunks, results } = await retrieveChunks(question, topK);

    if (totalChunks === 0) {
      return NextResponse.json(
        { error: "No documents have been ingested yet. Call /api/ingest first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      question,
      totalDocumentsChunks: totalChunks,
      results: results.map((chunk) => ({
        id: chunk.id,
        filename: chunk.filename,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score: chunk.score,
      })),
    });
  } catch (error) {
    console.error("Semantic search failed:", error);

    return NextResponse.json(
      { error: "Search failed. Check Ollama and the local knowledge store." },
      { status: 500 }
    );
  }
}
