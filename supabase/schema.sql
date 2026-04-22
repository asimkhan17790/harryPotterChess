-- ============================================================
-- Wizard's Chess — Supabase Schema
-- Run once in Supabase SQL Editor (Project Settings → SQL Editor)
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

-- profiles: one row per auth user, auto-created by trigger
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  house        TEXT CHECK (house IN ('gryffindor','slytherin','ravenclaw','hufflepuff')),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- game_records: one row per completed game (guests never insert)
CREATE TABLE public.game_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house         TEXT NOT NULL,
  game_mode     TEXT NOT NULL CHECK (game_mode IN ('human','ai')),
  difficulty    TEXT CHECK (difficulty IN ('easy','medium','hard')), -- NULL for human mode
  result        TEXT NOT NULL CHECK (result IN ('win','loss','draw')),
  reason        TEXT NOT NULL CHECK (reason IN ('checkmate','stalemate','draw')),
  move_count    INTEGER NOT NULL DEFAULT 0,
  duration_secs INTEGER NOT NULL DEFAULT 0,
  played_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Game record inserts go through Express + service key (no client INSERT policy)
CREATE POLICY "game_records_select_own"
  ON public.game_records FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Trigger: auto-create profile on first Google sign-in
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- View: aggregate stats (avoids N+1 in ProfileModal)
-- ------------------------------------------------------------

CREATE VIEW public.user_stats AS
SELECT
  user_id,
  COUNT(*)                                                                           AS games_played,
  COUNT(*) FILTER (WHERE result = 'win')                                             AS wins,
  COUNT(*) FILTER (WHERE result = 'loss')                                            AS losses,
  COUNT(*) FILTER (WHERE result = 'draw')                                            AS draws,
  ROUND(COUNT(*) FILTER (WHERE result='win')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS win_rate
FROM public.game_records
GROUP BY user_id;
