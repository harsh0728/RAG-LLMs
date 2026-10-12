
"use client";

import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askQuestion() {
    if (!question.trim() || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setAnswer(data.answer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">KnowledgePilot AI</h1>

      <p className="text-gray-600">
        Day 1: Your first LangChain-powered AI assistant.
      </p>

      <textarea
        className="min-h-32 w-full rounded-lg border p-4"
        placeholder="Ask a technical question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        onClick={askQuestion}
        disabled={loading || !question.trim()}
      >
        {loading ? "Generating..." : "Ask KnowledgePilot"}
      </button>

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      {answer && (
        <section className="whitespace-pre-wrap rounded-lg border p-5">
          <h2 className="mb-3 font-semibold">Response</h2>
          {answer}
        </section>
      )}
    </main>
  );
}
