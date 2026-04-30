import { useEffect, useRef, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { supabase } from '../lib/supabaseClient';

const HOUSE_COLORS: Record<string, string> = {
  gryffindor: '#c41e3a',
  slytherin: '#2a623d',
  ravenclaw: '#0e1a40',
  hufflepuff: '#f0c040',
};

const HOUSE_CRESTS: Record<string, string> = {
  gryffindor: '🦁',
  slytherin: '🐍',
  ravenclaw: '🦅',
  hufflepuff: '🦡',
};

type GameRecord = {
  id: string;
  house: string;
  game_mode: string;
  difficulty: string | null;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  move_count: number;
  duration_secs: number;
  played_at: string;
};

export default function ProfileModal() {
  const user = useUserStore((s) => s.user);
  const profile = useUserStore((s) => s.profile);
  const stats = useUserStore((s) => s.stats);
  const isOpen = useUserStore((s) => s.isProfileOpen);
  const closeProfile = useUserStore((s) => s.closeProfile);
  const fetchStats = useUserStore((s) => s.fetchStats);
  const setProfile = useUserStore((s) => s.setProfile);

  const syncHouseToProfile = useUserStore((s) => s.syncHouseToProfile);

  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingHouse, setSavingHouse] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchStats(user.id);
      supabase
        .from('game_records')
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setRecentGames(data as GameRecord[]);
        });
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingName]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeProfile();
    }
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const displayName = profile?.display_name || user.user_metadata?.full_name || 'Wizard';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const house = profile?.house;

  async function saveDisplayName() {
    if (!user || !nameInput.trim()) {
      setEditingName(false);
      return;
    }
    if (nameInput.trim().length > 50) return;
    const { data } = await supabase
      .from('profiles')
      .update({ display_name: nameInput.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
    setEditingName(false);
  }

  async function saveHouse(h: string) {
    if (savingHouse || h === house) return;
    setSavingHouse(true);
    await syncHouseToProfile(h);
    setSavingHouse(false);
  }

  function fmtDuration(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 300,
    background: 'radial-gradient(ellipse at center, rgba(10,4,30,0.97) 0%, rgba(3,1,12,0.99) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  };

  const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '760px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'rgba(8, 4, 22, 0.95)',
    border: '1px solid rgba(255, 215, 0, 0.35)',
    borderRadius: '16px',
    padding: '32px',
    position: 'relative',
    boxShadow: '0 0 60px rgba(255,215,0,0.08), 0 24px 64px rgba(0,0,0,0.7)',
    fontFamily: "'Cinzel', 'Georgia', serif",
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    color: '#ffd700',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  const statCardStyle: React.CSSProperties = {
    background: 'rgba(3,1,12,0.88)',
    border: '1px solid rgba(255,215,0,0.25)',
    borderRadius: '10px',
    padding: '12px 8px',
    textAlign: 'center',
    flex: '1 1 0',
    minWidth: '90px',
    overflow: 'hidden',
  };

  const resultColor = (r: string) => (r === 'win' ? '#4caf50' : r === 'loss' ? '#cc3333' : '#aaa');

  return (
    <div
      style={overlayStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeProfile();
      }}
    >
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={closeProfile}>
          ✕
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '2px solid rgba(255,215,0,0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,215,0,0.15)',
                border: '2px solid rgba(255,215,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                color: '#ffd700',
              }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveDisplayName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveDisplayName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                maxLength={50}
                style={{
                  background: 'rgba(255,215,0,0.08)',
                  border: '1px solid rgba(255,215,0,0.5)',
                  borderRadius: '6px',
                  color: '#ffd700',
                  fontSize: '20px',
                  fontFamily: "'Cinzel','Georgia',serif",
                  padding: '4px 8px',
                  outline: 'none',
                  width: '240px',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    color: '#ffd700',
                    fontSize: '20px',
                    fontWeight: 600,
                    letterSpacing: '1px',
                  }}
                >
                  {displayName}
                </span>
                <button
                  onClick={() => {
                    setNameInput(displayName);
                    setEditingName(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,215,0,0.5)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '2px 6px',
                  }}
                  title="Edit name"
                >
                  ✎
                </button>
              </div>
            )}
            {house && (
              <div
                style={{
                  marginTop: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: HOUSE_COLORS[house] + '33',
                  border: `1px solid ${HOUSE_COLORS[house]}88`,
                  color: '#e8d5a3',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  textTransform: 'capitalize',
                }}
              >
                {HOUSE_CRESTS[house]} {house}
              </div>
            )}
          </div>
        </div>

        {/* House picker */}
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              color: 'rgba(255,215,0,0.6)',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Favorite House
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {(['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'] as const).map((h) => {
              const selected = house === h;
              return (
                <button
                  key={h}
                  onClick={() => saveHouse(h)}
                  disabled={savingHouse}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: `1.5px solid ${selected ? HOUSE_COLORS[h] : 'rgba(255,215,0,0.2)'}`,
                    background: selected ? HOUSE_COLORS[h] + '33' : 'rgba(3,1,12,0.6)',
                    color: selected ? '#e8d5a3' : 'rgba(232,213,163,0.5)',
                    fontSize: '12px',
                    fontFamily: "'Cinzel','Georgia',serif",
                    letterSpacing: '1px',
                    textTransform: 'capitalize',
                    cursor: savingHouse ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selected ? `0 0 12px ${HOUSE_COLORS[h]}55` : 'none',
                  }}
                >
                  {HOUSE_CRESTS[h]} {h}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              color: 'rgba(255,215,0,0.6)',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Spell Record
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Games', value: stats?.games_played ?? 0 },
              { label: 'Wins', value: stats?.wins ?? 0, color: '#4caf50' },
              { label: 'Losses', value: stats?.losses ?? 0, color: '#cc3333' },
              { label: 'Draws', value: stats?.draws ?? 0, color: '#aaa' },
              {
                label: 'Win Rate',
                value: stats?.win_rate != null ? `${stats.win_rate}%` : '—',
                color: '#ffd700',
              },
              {
                label: 'Best Streak',
                value: stats?.longest_win_streak ?? 0,
                color: '#ffd700',
              },
              {
                label: 'Fastest Win',
                value: stats?.fastest_win_secs != null ? fmtDuration(stats.fastest_win_secs) : '—',
                color: '#4caf50',
              },
              {
                label: 'Avg Moves',
                value: stats?.avg_moves_per_game ?? '—',
              },
              {
                label: 'Favorite House',
                value: house
                  ? house.charAt(0).toUpperCase() + house.slice(1)
                  : stats?.favorite_house
                    ? stats.favorite_house.charAt(0).toUpperCase() + stats.favorite_house.slice(1)
                    : '—',
                color: house
                  ? HOUSE_COLORS[house]
                  : stats?.favorite_house
                    ? HOUSE_COLORS[stats.favorite_house]
                    : undefined,
              },
            ].map(({ label, value, color }) => (
              <div key={label} style={statCardStyle}>
                <div
                  style={{
                    color: color ?? '#e8d5a3',
                    fontSize: String(value).length > 6 ? '14px' : '20px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    lineHeight: 1.2,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    color: 'rgba(232,213,163,0.6)',
                    fontSize: '10px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent games */}
        <div>
          <div
            style={{
              color: 'rgba(255,215,0,0.6)',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Recent Battles
          </div>
          {recentGames.length === 0 ? (
            <div
              style={{
                color: 'rgba(232,213,163,0.4)',
                fontSize: '13px',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              No battles recorded yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentGames.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(3,1,12,0.7)',
                    border: '1px solid rgba(255,215,0,0.12)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e8d5a3',
                    gap: '12px',
                  }}
                >
                  <span
                    style={{
                      color: resultColor(g.result),
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      minWidth: '40px',
                      letterSpacing: '1px',
                    }}
                  >
                    {g.result}
                  </span>
                  <span style={{ flex: 1, textTransform: 'capitalize' }}>
                    {g.game_mode === 'ai'
                      ? `vs Oracle${g.difficulty ? ` (${g.difficulty})` : ''}`
                      : 'vs Wizard'}
                  </span>
                  <span style={{ color: 'rgba(232,213,163,0.5)' }}>{g.move_count} moves</span>
                  <span style={{ color: 'rgba(232,213,163,0.5)' }}>
                    {fmtDuration(g.duration_secs)}
                  </span>
                  <span
                    style={{ color: 'rgba(232,213,163,0.4)', minWidth: '90px', textAlign: 'right' }}
                  >
                    {fmtDate(g.played_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
