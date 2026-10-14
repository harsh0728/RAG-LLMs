
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredChunk = {
  id: string;
  filename: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  createdAt: string;
  pageNumber?:number;
};

const dataDirectory = path.join(process.cwd(), "data");
const storePath = path.join(dataDirectory, "knowledgepilot-store.json");

async function ensureStore(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, "[]", "utf8");
  }
}

export async function readChunks(): Promise<StoredChunk[]> {
  await ensureStore();

  const raw = await readFile(storePath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Knowledge store must contain a JSON array.");
  }
  return parsed as StoredChunk[];
}

export async function saveDocumentChunks(
  filename: string,
  chunks: string[],
  vectors: number[][],
  pageNumbers?: (number | undefined)[]
): Promise<StoredChunk[]> {
  if (chunks.length !== vectors.length) {
    throw new Error("Chunks and embeddings must have the same length.");
  }
  if (pageNumbers && pageNumbers.length!=chunks.length) {
    throw new Error("Page numbers and chunks must have the same length.");
  }

  const existing = await readChunks();

  const newChunks: StoredChunk[] = chunks.map((content, index) => ({
    id: randomUUID(),
    filename,
    chunkIndex: index,
    content,
    embedding: vectors[index],
    createdAt: new Date().toISOString(),
    ...(pageNumbers?.[index]!=undefined?{pageNumber:pageNumbers[index]}:{})
  }));

  // Re-ingesting the same filename replaces its earlier chunks.
  const retained = existing.filter((chunk) => chunk.filename !== filename);
  const updated = [...retained, ...newChunks];

  await writeFile(storePath, JSON.stringify(updated), "utf8");

  return newChunks;
}
