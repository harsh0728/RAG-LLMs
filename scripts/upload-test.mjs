
import { readFile } from "node:fs/promises";
import path from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/upload-test.mjs <file-path>");
  process.exit(1);
}

const buffer = await readFile(filePath);
const filename = path.basename(filePath);
const form = new FormData();

form.append(
  "file",
  new Blob([buffer]),
  filename
);

const response = await fetch("http://localhost:3000/api/upload", {
  method: "POST",
  body: form,
});

console.log("HTTP status:", response.status);
console.log(JSON.stringify(await response.json(), null, 2));
