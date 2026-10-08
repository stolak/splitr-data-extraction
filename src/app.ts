import express from "express";
import cors from "cors";
import { uploadInvoice } from "./middlewares/invoiceUpload";
import { invoiceExtractionController } from "./controllers/invoiceExtractionController";

const app = express();

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.post("/extract", uploadInvoice, (req, res) => {
  return invoiceExtractionController.extract(req, res);
});

export default app;
