import multer from "multer";
import { Request } from "express";

/**
 * Multer configured for in-memory storage.
 * Images are kept in memory as Buffer, then converted to Base64 data URIs
 * before saving to MongoDB. Max 5 MB, only image types.
 */
const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Convert a multer file buffer to a Base64 data URI string.
 */
export function fileToBase64DataUri(file: Express.Multer.File): string {
  const base64 = file.buffer.toString("base64");
  return `data:${file.mimetype};base64,${base64}`;
}
