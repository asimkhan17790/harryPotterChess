import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/requireAuth';

const router = Router();

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Simple in-memory rate limiter: max 100 inserts per user per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

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
  move_count: z.number().int().min(0),
  duration_secs: z.number().int().min(0),
});

router.post('/games', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

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
    res.status(500).json({ code: 'DB_ERROR', message: error.message });
    return;
  }

  res.status(201).json({ id: data.id });
});

export default router;
