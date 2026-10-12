
import { NextResponse } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

// export const runtime = "nodejs";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
});

const model = new ChatOllama({
  model: process.env.OLLAMA_CHAT_MODEL ?? "qwen2.5:3b",
  baseUrl:
    process.env.OLLAMA_BASE_URL ??
    "http://127.0.0.1:11434",
  temperature: 0.2,
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid question." },
        { status: 400 }
      );
    }

    const response = await model.invoke([
      [
        "system",
        "You are KnowledgePilot, a precise technical assistant."
      ],
      ["human", parsed.data.question],
    ]);

    const answer =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Local Ollama request failed:", error);

    return NextResponse.json(
      {
        error:
          "Could not reach the local model. Check Ollama and the model configuration.",
      },
      { status: 503 }
    );
  }
}
