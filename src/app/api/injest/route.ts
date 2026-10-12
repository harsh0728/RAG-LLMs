
import { NextResponse } from "next/server";
import { z } from "zod";
import { chunkDocument } from "@/lib/chunking";
import { embedDocuments } from "@/lib/embeddings";
import { saveDocumentChunks } from "@/lib/store";

// export const runtime = "nodejs";

const schema = z.object({
  filename: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(100_000),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide a filename and non-empty text up to 100,000 characters." },
        { status: 400 }
      );
    }

    const { filename, text } = parsed.data;

    // 1. Split the document into chunks.
    const chunks = await chunkDocument(text);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No usable text was found." },
        { status: 400 }
      );
    }

    // 2. Generate document embeddings once during ingestion.
    const vectors = await embedDocuments(chunks);

    // 3. Persist chunk text, metadata, and embeddings.
    const saved = await saveDocumentChunks(filename, chunks, vectors);

    return NextResponse.json({
      message: "Document ingested successfully.",
      filename,
      totalChunks: saved.length,
      chunks: saved.map(({ id, filename, chunkIndex, content }) => ({
        id,
        filename,
        chunkIndex,
        content,
      })),
    });
  } catch (error) {
    console.error("Document ingestion failed:", error);

    return NextResponse.json(
      {
        error: "Document ingestion failed. Check that Ollama is running and the embedding model is available.",
      },
      { status: 500 }
    );
  }
}
