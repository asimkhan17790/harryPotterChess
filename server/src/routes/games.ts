import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

// Simple in-memory rate limiter: max 100 inserts per user per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Purge expired entries once per hour to prevent unbounded memory growth
setInterval(() => {
  for (const [k, v] of rateLimitMap) {
    if (Date.now() > v.resetAt) rateLimitMap.delete(k);
  }
}, 3_600_000);

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 100) return false;
  entry.count++;
  return true;
}

const gameRecordSchema = z.object({
  house: z.enum(['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff']),
  game_mode: z.enum(['human', 'ai']),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable(),
  result: z.enum(['win', 'loss', 'draw']),
  reason: z.enum(['checkmate', 'stalemate', 'draw']),
  move_count: z.number().int().min(0).max(600),
  duration_secs: z.number().int().min(0).max(86400),
});

router.post('/games', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user identity' });
    return;
  }

  if (!checkRateLimit(userId)) {
    res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many game records this hour' });
    return;
  }

  const parsed = gameRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: 'INVALID_PAYLOAD', message: parsed.error.message });
    return;
  }

  const { error, data } = await supabaseAdmin
    .from('game_records')
    .insert({
      user_id: userId,
      ...parsed.data,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[games POST] DB error:', error);
    res.status(500).json({ code: 'DB_ERROR', message: 'Failed to save game record' });
    return;
  }

  res.status(201).json({ id: data.id });
});

export default router;
