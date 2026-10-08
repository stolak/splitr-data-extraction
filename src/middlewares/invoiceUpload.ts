import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { extractionConfig } from "../services/extractionConfig";

const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];

function invoiceUploader() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: extractionConfig.maxUploadBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!allowedTypes.includes(file.mimetype)) {
        callback(new Error("Only PDF, PNG and JPEG files are accepted."));
        return;
      }
      callback(null, true);
    },
  }).single("invoice");
}

export function uploadInvoice(req: Request, res: Response, next: NextFunction) {
  invoiceUploader()(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Invoice file exceeds the maximum upload size."
        : error instanceof Error
          ? error.message
          : "Invoice upload failed.";

    res.status(400).json({ success: false, message });
  });
}
