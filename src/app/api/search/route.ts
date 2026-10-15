import { NextResponse } from "next/server";
import { z } from "zod";
import { retrieveChunks } from "@/lib/retrieval";

const schema = z.object({
  question: z.string().trim().min(1).max(2000),
  topK: z.number().int().min(1).max(10).optional(),
  filename: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Provide a question, an optional topK between 1 and 10, and an optional filename.",
        },
        { status: 400 }
      );
    }

    const { question, topK = 3, filename } = parsed.data;

    const { totalChunks, results } = await retrieveChunks(
      question,
      topK,
      filename
    );

    if (totalChunks === 0) {
      return NextResponse.json(
        {
          error: filename
            ? `No chunks found for "${filename}". Check the stored filename and upload status.`
            : "No documents have been ingested yet. Call /api/ingest or /api/upload first.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      question,
      filename: filename ?? null,
      totalDocumentsChunks: totalChunks,
      results: results.map((chunk) => ({
        id: chunk.id,
        filename: chunk.filename,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        score: chunk.score,
        pageNumber: chunk.pageNumber ?? null,
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