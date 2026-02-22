import express from "express";
import cors from "cors";
import "dotenv/config";
import { verifyDatabaseConnection } from "./db/client.js";
import { matchesRouter } from "./routes/matches.js";

const app = express();
const port = Number(process.env.PORT ?? 8000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/matches", matchesRouter);
app.get("/", (_req, res) => {
  res.send("Hello World!");
});

async function startServer() {
  try {
    await verifyDatabaseConnection();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup aborted due to database error.");
    process.exit(1);
  }
}

void startServer();
