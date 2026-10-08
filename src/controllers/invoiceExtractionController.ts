import type { Request, Response } from "express";
import { invoiceExtractionService } from "../services/invoiceExtractionService";

export const invoiceExtractionController = {
  extract: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Invoice file is required.",
        });
      }

      const includeRawText = req.query.includeRawText === "true";
      const invoice = await invoiceExtractionService.extract(req.file.buffer, { includeRawText });

      return res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice extraction failed.";
      const status = /unsupported|invalid file|no readable text/i.test(message) ? 400 : 500;
      return res.status(status).json({ success: false, message });
    }
  },
};
