import { Router } from "express";

export const commentaryRouter = Router();

commentaryRouter.get("/", (req, res) => {
  res.json({ message: "List of commentaries" });
});