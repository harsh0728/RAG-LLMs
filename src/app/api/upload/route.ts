// import { NextResponse } from "next/server";
// import { PDFParse } from "pdf-parse";
// import { chunkDocument } from "@/lib/chunking";
// import { embedDocuments } from "@/lib/embeddings";
// import { saveDocumentChunks } from "@/lib/store";

// // export const runtime = "nodejs";

// const MAX_FILE_SIZE = 5 * 1024 * 1024;
// const MAX_PDF_PAGES = 100;

// function cleanFilename(filename: string): string {
//   return filename
//     .replace(/[\\/<>:"|?*\x00-\x1F]/g, "_")
//     .trim()
//     .slice(0, 200);
// }

// export async function POST(request: Request) {
//   let parser: PDFParse | undefined;

//   try {
//     const formData = await request.formData();
//     const file = formData.get("file");

//     if (!(file instanceof File)) {
//       return NextResponse.json(
//         { error: "Upload a file using the 'file' form field." },
//         { status: 400 }
//       );
//     }

//     if (file.size === 0) {
//       return NextResponse.json(
//         { error: "The uploaded file is empty." },
//         { status: 400 }
//       );
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       return NextResponse.json(
//         { error: "Maximum upload size is 5 MB." },
//         { status: 413 }
//       );
//     }

//     const filename = cleanFilename(file.name);
//     const extension = filename.toLowerCase().split(".").pop();

//     if (!filename || !["txt", "pdf"].includes(extension ?? "")) {
//       return NextResponse.json(
//         { error: "Only .txt and .pdf files are supported." },
//         { status: 400 }
//       );
//     }

//     const bytes = new Uint8Array(await file.arrayBuffer());

//     let chunks: string[] = [];
//     let pageNumbers: (number | undefined)[] | undefined;

//     if (extension === "txt") {
//       let text: string;

//       try {
//         text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
//       } catch {
//         return NextResponse.json(
//           { error: "The TXT file must contain valid UTF-8 text." },
//           { status: 400 }
//         );
//       }

//       if (!text.trim()) {
//         return NextResponse.json(
//           { error: "No readable text was found in the file." },
//           { status: 400 }
//         );
//       }

//       chunks = await chunkDocument(text);
//     } else {
//       const signature = new TextDecoder().decode(bytes.slice(0, 5));

//       if (signature !== "%PDF-") {
//         return NextResponse.json(
//           { error: "The file does not have a valid PDF signature." },
//           { status: 400 }
//         );
//       }

//       parser = new PDFParse({ data: bytes });

//       const info = await parser.getInfo();
//       const totalPages = info.total;

//       if (!totalPages || totalPages < 1) {
//         return NextResponse.json(
//           { error: "No readable PDF pages were found." },
//           { status: 400 }
//         );
//       }

//       if (totalPages > MAX_PDF_PAGES) {
//         return NextResponse.json(
//           { error: `PDFs are limited to ${MAX_PDF_PAGES} pages.` },
//           { status: 413 }
//         );
//       }

//       pageNumbers = [];

//       for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
//         const pageResult = await parser.getText({
//           partial: [pageNumber],
//         });

//         const pageText = pageResult.text.trim();

//         if (!pageText) continue;

//         const pageChunks = await chunkDocument(pageText);

//         chunks.push(...pageChunks);
//         pageNumbers.push(
//           ...pageChunks.map(() => pageNumber)
//         );
//       }

//       if (chunks.length === 0) {
//         return NextResponse.json(
//           {
//             error:
//               "No selectable text was found. This may be a scanned PDF; OCR is not supported yet.",
//           },
//           { status: 400 }
//         );
//       }
//     }

//     const vectors = await embedDocuments(chunks);

//     await saveDocumentChunks(
//       filename,
//       chunks,
//       vectors,
//       pageNumbers
//     );

//     return NextResponse.json(
//       {
//         message: "File processed and stored successfully.",
//         filename,
//         fileType: extension,
//         chunksStored: chunks.length,
//         pagesWithText:
//           pageNumbers === undefined
//             ? null
//             : new Set(pageNumbers).size,
//         chunks: chunks.map((content, index) => ({
//           chunkIndex: index,
//           ...(pageNumbers?.[index] !== undefined
//             ? { pageNumber: pageNumbers[index] }
//             : {}),
//           characters: content.length,
//         })),
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("Upload error:", error);

//     return NextResponse.json(
//       { error: "File processing failed. Check the server logs." },
//       { status: 500 }
//     );
//   } finally {
//     if (parser) {
//       await parser.destroy().catch(() => {});
//     }
//   }
// }

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { chunkDocument } from "@/lib/chunking";
import { embedDocuments } from "@/lib/embeddings";
import { saveDocumentChunks } from "@/lib/store";


const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 100;

function cleanFilename(filename: string): string {
  return filename
    .replace(/[\\/<>:"|?*\x00-\x1F]/g, "_")
    .trim()
    .slice(0, 200);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload a file using the 'file' form field." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Maximum upload size is 5 MB." },
        { status: 413 }
      );
    }

    const filename = cleanFilename(file.name);
    const extension = filename.toLowerCase().split(".").pop();

    if (!filename || !["txt", "pdf"].includes(extension ?? "")) {
      return NextResponse.json(
        { error: "Only .txt and .pdf files are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let chunks: string[] = [];
    let pageNumbers: (number | undefined)[] | undefined;

    // 1. Extract TXT content
    if (extension === "txt") {
      let text: string;

      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        return NextResponse.json(
          { error: "The TXT file must contain valid UTF-8 text." },
          { status: 400 }
        );
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: "No readable text was found in the file." },
          { status: 400 }
        );
      }

      chunks = await chunkDocument(text);
    }

    // 2. Extract PDF content page by page
    else {
      const signature = new TextDecoder().decode(bytes.slice(0, 5));

      if (signature !== "%PDF-") {
        return NextResponse.json(
          { error: "The file does not have a valid PDF signature." },
          { status: 400 }
        );
      }

      let pdf;

      try {
        pdf = await getDocumentProxy(bytes);

        const { totalPages, text } = await extractText(pdf, {
          mergePages: false,
        });

        if (!totalPages || totalPages < 1) {
          return NextResponse.json(
            { error: "No readable PDF pages were found." },
            { status: 400 }
          );
        }

        if (totalPages > MAX_PDF_PAGES) {
          return NextResponse.json(
            { error: `PDFs are limited to ${MAX_PDF_PAGES} pages.` },
            { status: 413 }
          );
        }

        // With mergePages:false, unpdf returns text for each page.
        const pageTexts = Array.isArray(text) ? text : [text];

        chunks = [];
        pageNumbers = [];

        for (let index = 0; index < pageTexts.length; index++) {
          const pageText = pageTexts[index]?.trim();

          if (!pageText) continue;

          const currentPage = index + 1;
          const pageChunks = await chunkDocument(pageText);

          chunks.push(...pageChunks);
          pageNumbers.push(
            ...pageChunks.map(() => currentPage)
          );
        }

        if (chunks.length === 0) {
          return NextResponse.json(
            {
              error:
                "No selectable text was found. This may be a scanned PDF; OCR is not supported yet.",
            },
            { status: 400 }
          );
        }
      } finally {
        if (pdf) {
          await pdf.cleanup();
        }
      }
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No text chunks were generated from the file." },
        { status: 400 }
      );
    }

    // 3. Generate local Ollama embeddings
    let vectors: number[][];

    try {
      vectors = await embedDocuments(chunks);
    } catch (error) {
      console.error("Embedding engine failed:", error);

      return NextResponse.json(
        {
          error:
            "Could not connect to the local embedding engine. Make sure Ollama is running and the embedding model is available.",
        },
        { status: 503 }
      );
    }

    // 4. Persist chunks and optional page metadata
    await saveDocumentChunks(
      filename,
      chunks,
      vectors,
      pageNumbers
    );

    // 5. Return ingestion summary
    return NextResponse.json(
      {
        message: "File processed and stored successfully.",
        filename,
        fileType: extension,
        chunksStored: chunks.length,
        pagesWithText:
          pageNumbers === undefined
            ? null
            : new Set(pageNumbers).size,
        chunks: chunks.map((content, index) => ({
          chunkIndex: index,
          pageNumber: pageNumbers?.[index] ?? null,
          characters: content.length,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { error: "File processing failed. Check the server logs." },
      { status: 500 }
    );
  }
}

