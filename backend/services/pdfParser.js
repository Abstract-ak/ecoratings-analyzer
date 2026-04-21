import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

async function parsePDF(filePath) {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extract(filePath, mimeType) {
  if (mimeType === "application/pdf") {
    return parsePDF(filePath);
  }

  return readFile(filePath, "utf8");
}

// export { extract, parsePDF };
export default { extract, parsePDF };
