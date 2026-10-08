import "dotenv/config";
import app from "./app";

const port = Number(process.env.PORT) || 5003;
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Data extraction listening on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
});
