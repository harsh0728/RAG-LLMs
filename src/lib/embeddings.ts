
import { OllamaEmbeddings } from "@langchain/ollama";

export const embeddings = new OllamaEmbeddings({
  baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  model: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
});

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  return embeddings.embedDocuments(texts);
}

export async function embedQuery(text: string): Promise<number[]> {
  return embeddings.embedQuery(text);
}
