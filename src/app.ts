import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { uploadInvoice } from "./middlewares/invoiceUpload";
import { invoiceExtractionController } from "./controllers/invoiceExtractionController";
import { openApiSpec } from "./docs/openapi";

const app = express();

app.use(cors());

app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.post("/extract", uploadInvoice, (req, res) => {
  return invoiceExtractionController.extract(req, res);
});

export default app;
