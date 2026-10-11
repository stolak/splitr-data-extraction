import type { Request, Response } from "express";
import { extractionConfig } from "../services/extractionConfig";
import { openaiTextExtractionService } from "../services/openaiTextExtractionService";

export const textExtractionController = {
  extract: async (req: Request, res: Response) => {
    try {
      const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
      if (!text) {
        return res.status(400).json({
          success: false,
          message: "Text is required.",
        });
      }

      if (text.length > extractionConfig.maxTextChars) {
        return res.status(400).json({
          success: false,
          message: "Text exceeds the maximum length.",
        });
      }

      const result = await openaiTextExtractionService.extract(text);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Text extraction failed.";
      const status = /not configured/i.test(message) ? 500 : 502;
      return res.status(status).json({ success: false, message });
    }
  },
};
