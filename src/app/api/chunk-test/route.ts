
import { NextResponse } from "next/server";
import { z } from "zod";
import { chunkDocument } from "@/lib/chunking";

// export const runtime = "nodejs";

const schema = z.object({
  text: z.string().trim().min(1).max(20000),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide non-empty text up to 20,000 characters." },
        { status: 400 }
      );
    }

    const chunks = await chunkDocument(parsed.data.text);
    console.log("chunks result:", chunks);
    return NextResponse.json({
      totalChunks: chunks.length,
      chunks: chunks.map((content, index) => ({
        chunkIndex: index,
        length: content.length,
        content,
      })),
    });
  } catch (error) {
    console.error("Chunking failed:", error);

    return NextResponse.json(
      { error: "Could not split the supplied text." },
      { status: 500 }
    );
  }
}
