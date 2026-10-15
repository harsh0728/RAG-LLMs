
import { embedQuery } from "@/lib/embeddings";
import { readChunks, type StoredChunk } from "@/lib/store";

export type RetrievedChunk = StoredChunk & {
  score: number;
};

export async function retrieveChunks(
  question: string,
  topK = 3,
  filename?:string
): Promise<{ totalChunks: number; results: RetrievedChunk[] }> {
  const storedChunks = await readChunks();

  // Filter documents BEFORE ranking their chunks.
  const filteredChunks = filename?.trim()
    ? storedChunks.filter((chunk) =>chunk.filename.toLowerCase() === filename.trim().toLowerCase()): storedChunks;
  if (filteredChunks.length === 0) {
    return { totalChunks: 0, results: [] };
  }

  // Embed only the user's question.
  const queryVector = await embedQuery(question);

  const results = filteredChunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
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
