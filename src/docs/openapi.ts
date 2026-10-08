import { extractionConfig } from "../services/extractionConfig";

const maxUploadMb = Math.round(extractionConfig.maxUploadBytes / (1024 * 1024));

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Splitr Data Extraction",
    version: "1.0.0",
    description:
      "Extracts merchant, amount, date, and line items from invoice PDFs and images.",
  },
  servers: [
    {
      url: "/",
      description: "Current server",
    },
  ],
  tags: [
    { name: "Health", description: "Service status" },
    { name: "Extraction", description: "Invoice data extraction" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Service is running",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/extract": {
      post: {
        tags: ["Extraction"],
        summary: "Extract invoice data",
        description: `Upload a single PDF, PNG, or JPEG invoice (max ${maxUploadMb} MB). The file field name is \`invoice\`.`,
        operationId: "extractInvoice",
        parameters: [
          {
            name: "includeRawText",
            in: "query",
            required: false,
            description: "When true, the response includes the extracted raw text.",
            schema: {
              type: "boolean",
              default: false,
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["invoice"],
                properties: {
                  invoice: {
                    type: "string",
                    format: "binary",
                    description: "Invoice file. Accepted types: PDF, PNG, JPEG.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Invoice extracted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExtractionSuccess" },
              },
            },
          },
          "400": {
            description: "Missing file, unsupported type, invalid content, or file too large",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "500": {
            description: "Extraction failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", example: "OK" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Invoice file is required." },
        },
      },
      ExtractionSuccess: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: "#/components/schemas/ExtractedInvoice" },
        },
      },
      ExtractedInvoice: {
        type: "object",
        required: ["merchantName", "totalAmount", "currency", "invoiceDate", "items", "confidence", "extraction"],
        properties: {
          rawText: {
            type: "string",
            description: "Present only when includeRawText=true.",
          },
          merchantName: { type: "string", nullable: true },
          totalAmount: { type: "number", nullable: true },
          currency: {
            type: "string",
            enum: ["CAD", "USD", "NGN", "GBP", "EUR", "UNKNOWN"],
          },
          invoiceDate: {
            type: "string",
            nullable: true,
            description: "Invoice date as extracted from the document.",
          },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/InvoiceItem" },
          },
          confidence: { $ref: "#/components/schemas/ExtractionConfidence" },
          extraction: { $ref: "#/components/schemas/ExtractionMeta" },
        },
      },
      InvoiceItem: {
        type: "object",
        required: ["description", "quantity", "unitPrice", "totalPrice", "confidence"],
        properties: {
          description: { type: "string" },
          quantity: { type: "number", nullable: true },
          unitPrice: { type: "number", nullable: true },
          totalPrice: { type: "number", nullable: true },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
      ExtractionConfidence: {
        type: "object",
        required: ["merchant", "total", "date", "items", "overall"],
        properties: {
          merchant: { type: "number", minimum: 0, maximum: 1 },
          total: { type: "number", minimum: 0, maximum: 1 },
          date: { type: "number", minimum: 0, maximum: 1 },
          items: { type: "number", minimum: 0, maximum: 1 },
          overall: { type: "number", minimum: 0, maximum: 1 },
        },
      },
      ExtractionMeta: {
        type: "object",
        required: ["source", "pages", "ocrUsed"],
        properties: {
          source: { type: "string", enum: ["pdf-text", "ocr"] },
          pages: { type: "integer", minimum: 1 },
          ocrUsed: { type: "boolean" },
          rawText: {
            type: "string",
            description: "Present only when includeRawText=true.",
          },
        },
      },
    },
  },
} as const;
