import express from 'express';

export const matchesRouter = express.Router();

matchesRouter.get('/', (req, res) => {
  res.json({ message: 'Matches endpoint' });
});

