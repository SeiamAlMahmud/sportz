import express from "express";
import cors from "cors";
import http from "http";
import "dotenv/config";
import { verifyDatabaseConnection } from "./db/client.js";
import { matchesRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";

const PORT = Number(process.env.PORT ?? 8000);
const HOST = process.env.HOST ?? "0.0.0.0";
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(securityMiddleware());
app.use("/api/matches", matchesRouter);
app.get("/", (_req, res) => {
  res.send("Hello World!");
});

async function startServer() {
  try {
    await verifyDatabaseConnection();
    const { brodCastMatchCreated } = attachWebSocketServer(server);
    app.locals.brodCastMatchCreated = brodCastMatchCreated;
    server.listen(PORT, HOST, () => {
      const baseUrl = HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
      console.log(`Server is running on port ${baseUrl}`);
      console.log(`websocket server is running on  ${baseUrl.replace("http", "ws")}/ws`);
    });
  } catch (error) {
    console.error("Server startup aborted due to database error.");
    process.exit(1);
  }
}

void startServer();
