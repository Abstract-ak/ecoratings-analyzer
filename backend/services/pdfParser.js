import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

async function parsePDF(filePath) {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

async function extract(filePath, mimeType) {
  if (mimeType === "application/pdf") {
    return parsePDF(filePath);
  }

  return readFile(filePath, "utf8");
}

// export { extract, parsePDF };
export default { extract, parsePDF };
