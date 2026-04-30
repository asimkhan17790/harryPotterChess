-- ============================================================
-- Migration: Extend user_stats view with additional metrics
-- Apply: paste into Supabase SQL Editor (Project Settings → SQL Editor)
-- Idempotent: drops + recreates the view.
-- ============================================================

DROP VIEW IF EXISTS public.user_stats;

CREATE VIEW public.user_stats AS
WITH base AS (
  SELECT
    user_id,
    result,
    house,
    move_count,
    duration_secs,
    played_at,
    -- Mark each game as a win (1) or non-win (0) for streak math.
    CASE WHEN result = 'win' THEN 1 ELSE 0 END AS is_win,
    -- Group consecutive wins (gaps-and-islands): cumulative count of non-wins per user.
    SUM(CASE WHEN result = 'win' THEN 0 ELSE 1 END)
      OVER (PARTITION BY user_id ORDER BY played_at) AS streak_grp
  FROM public.game_records
),
streaks AS (
  SELECT
    user_id,
    MAX(streak_len) AS longest_win_streak
  FROM (
    SELECT user_id, streak_grp, COUNT(*) FILTER (WHERE is_win = 1) AS streak_len
    FROM base
    GROUP BY user_id, streak_grp
  ) s
  GROUP BY user_id
),
agg AS (
  SELECT
    user_id,
    COUNT(*)                                                                            AS games_played,
    COUNT(*) FILTER (WHERE result = 'win')                                              AS wins,
    COUNT(*) FILTER (WHERE result = 'loss')                                             AS losses,
    COUNT(*) FILTER (WHERE result = 'draw')                                             AS draws,
    ROUND(COUNT(*) FILTER (WHERE result='win')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1)  AS win_rate,
    MIN(duration_secs) FILTER (WHERE result = 'win' AND reason = 'checkmate')           AS fastest_win_secs,
    ROUND(AVG(move_count)::NUMERIC, 1)                                                  AS avg_moves_per_game,
    MODE() WITHIN GROUP (ORDER BY house)                                                AS favorite_house,
    MAX(played_at)                                                                      AS last_played_at
  FROM public.game_records
  GROUP BY user_id
)
SELECT
  a.user_id,
  a.games_played,
  a.wins,
  a.losses,
  a.draws,
  a.win_rate,
  COALESCE(s.longest_win_streak, 0) AS longest_win_streak,
  a.fastest_win_secs,
  a.avg_moves_per_game,
  a.favorite_house,
  a.last_played_at
FROM agg a
LEFT JOIN streaks s USING (user_id);
