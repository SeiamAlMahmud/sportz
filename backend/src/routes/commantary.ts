import { Router } from "express";
import { db } from "../db/client.js";
import { commentary } from "../db/schema.js";
import {
  createCommentarySchema,
  matchIdParamSchema,
} from "../validation/commentaryValidation.js";

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.post("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload.",
      details: bodyResult.error.issues,
    });
  }

  try {
    const { minutes, sequence, period, eventType, actor, team, message, metadata, tags } =
      bodyResult.data;

    const [result] = await db
      .insert(commentary)
      .values({
        matchId: paramsResult.data.id,
        minutes,
        sequence: sequence ?? 1,
        period: period ?? "regular",
        eventType: eventType ?? "update",
        actor,
        team,
        message,
        metadata,
        tags,
      })
      .returning();

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error("Failed to create commentary:", error);
    return res.status(500).json({
      error: "Failed to create commentary.",
    });
  }
});
