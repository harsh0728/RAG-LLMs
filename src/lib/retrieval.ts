
import { embedQuery } from "@/lib/embeddings";
import { readChunks, type StoredChunk } from "@/lib/store";

export type RetrievedChunk = StoredChunk & {
  score: number;
};

export type RetrievalMode = "semantic" | "document";

export async function retrieveChunks(
  question: string,
  topK = 3,
  filename?: string,
  retrievalMode: RetrievalMode = "semantic"
): Promise<{ totalChunks: number; results: RetrievedChunk[] }> {
  const storedChunks = await readChunks();

  const filteredChunks = filename?.trim()
    ? storedChunks.filter(
        (chunk) =>
          chunk.filename.toLowerCase() === filename.trim().toLowerCase()
      )
    : storedChunks;

  if (filteredChunks.length === 0) {
    return { totalChunks: 0, results: [] };
  }

  const queryVector = await embedQuery(question);

  const scoredChunks = filteredChunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryVector, chunk.embedding),
  }));

  const results =
    retrievalMode === "document"
      ? scoredChunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
      : scoredChunks
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

  return {
    totalChunks: filteredChunks.length,
    results,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
