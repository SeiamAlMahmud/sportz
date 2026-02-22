import express from 'express';
import { asc, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createMatchSchema } from '../validation/matches.js';
import { db } from '../db/client.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';

export const matchesRouter = express.Router();

const listMatchesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['id', 'startTime', 'createdAt', 'sport']).default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

matchesRouter.get('/', async (req, res) => {
  const parsedQuery = listMatchesSchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      error: 'Invalid query params.',
      details: parsedQuery.error.issues,
    });
  }

  const { page, limit, sortBy, sortOrder } = parsedQuery.data;
  const offset = (page - 1) * limit;

  const sortColumn = {
    id: matches.id,
    startTime: matches.startTime,
    createdAt: matches.createdAt,
    sport: matches.sport,
  }[sortBy];
  const sortExpr = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  try {
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches);
    const total = Number(totalRow?.count ?? 0);

    const items = await db
      .select()
      .from(matches)
      .orderBy(sortExpr)
      .limit(limit)
      .offset(offset);

    return res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      sorting: {
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({
      error: 'Internal server error.',
    });
  }
});


matchesRouter.post('/', async(req, res) => {
    console.log("Received match creation request:", req.body);
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            error: 'Request body is missing or invalid.',
            details: 'Send JSON with Content-Type: application/json',
        });
    }
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid payload.",
            details: parsed.error.issues,
        })
    }
    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(parsed.data.startTime),
            endTime: new Date(parsed.data.endTime),
            homeScore: parsed.data.homeScore ?? 0,
            awayTeam: parsed.data.awayTeam,
            awayScore: parsed.data.awayScore ?? 0,
            status: getMatchStatus(parsed.data.startTime, parsed.data.endTime) ?? 'scheduled',
        }).returning();
        return res.status(201).json(event);
    } catch (error) {
        console.error("Error creating match:", error);
        return res.status(500).json({ 
            error: "Internal server error.",
             details: JSON.stringify(error) });
    }
});
