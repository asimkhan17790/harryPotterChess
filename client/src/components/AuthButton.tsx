import { useEffect, useRef, useState } from 'react';
import { useUserStore } from '../stores/userStore';

export default function AuthButton() {
  const user = useUserStore((s) => s.user);
  const profile = useUserStore((s) => s.profile);
  const signInWithGoogle = useUserStore((s) => s.signInWithGoogle);
  const signOut = useUserStore((s) => s.signOut);
  const openProfile = useUserStore((s) => s.openProfile);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const noHover = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 'calc(16px + var(--safe-top))',
    right: 'calc(16px + var(--safe-right))',
    zIndex: 200,
    fontFamily: "'Cinzel', 'Georgia', serif",
  };

  const signInBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    minHeight: '44px',
    background: 'rgba(3, 1, 12, 0.85)',
    border: '1px solid rgba(255, 215, 0, 0.6)',
    borderRadius: '24px',
    color: '#ffd700',
    fontSize: '13px',
    fontFamily: "'Cinzel', 'Georgia', serif",
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    letterSpacing: '0.5px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    whiteSpace: 'nowrap',
  };

  const pillStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px 6px 6px',
    minHeight: '44px',
    background: 'rgba(3, 1, 12, 0.85)',
    border: '1px solid rgba(255, 215, 0, 0.6)',
    borderRadius: '24px',
    color: '#ffd700',
    fontSize: '13px',
    fontFamily: "'Cinzel', 'Georgia', serif",
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    letterSpacing: '0.5px',
    userSelect: 'none',
  };

  const avatarStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid rgba(255,215,0,0.5)',
    objectFit: 'cover',
  };

  const avatarPlaceholderStyle: React.CSSProperties = {
    ...avatarStyle,
    background: 'rgba(255,215,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'rgba(3, 1, 12, 0.95)',
    border: '1px solid rgba(255, 215, 0, 0.4)',
    borderRadius: '12px',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    minWidth: '180px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    color: '#e8d5a3',
    fontSize: '13px',
    fontFamily: "'Cinzel', 'Georgia', serif",
    cursor: 'pointer',
    textAlign: 'left',
    letterSpacing: '0.5px',
    transition: 'background 0.15s, color 0.15s',
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || 'Wizard';
  const truncatedName = displayName.length > 16 ? displayName.slice(0, 16) + '…' : displayName;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  if (!user) {
    return (
      <div style={containerStyle}>
        <button
          style={signInBtnStyle}
          onClick={signInWithGoogle}
          onMouseEnter={(e) => {
            if (noHover) return;
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,215,0,0.9)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 12px rgba(255,215,0,0.25)';
          }}
          onMouseLeave={(e) => {
            if (noHover) return;
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,215,0,0.6)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle} ref={containerRef}>
      <div style={pillStyle} onClick={() => setDropdownOpen((o) => !o)}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={avatarStyle} />
        ) : (
          <div style={avatarPlaceholderStyle as React.CSSProperties}>
            {truncatedName[0]?.toUpperCase()}
          </div>
        )}
        <span>{truncatedName}</span>
        <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '2px' }}>▾</span>
      </div>

      {dropdownOpen && (
        <div style={dropdownStyle}>
          <button
            style={dropdownItemStyle}
            onMouseEnter={(e) => {
              if (noHover) return;
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,215,0,0.08)';
            }}
            onMouseLeave={(e) => {
              if (noHover) return;
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            onClick={() => {
              setDropdownOpen(false);
              openProfile();
            }}
          >
            ✦ Profile &amp; Stats
          </button>
          <div style={{ height: '1px', background: 'rgba(255,215,0,0.15)', margin: '0 8px' }} />
          <button
            style={{ ...dropdownItemStyle, color: '#cc8888' }}
            onMouseEnter={(e) => {
              if (noHover) return;
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,100,100,0.08)';
            }}
            onMouseLeave={(e) => {
              if (noHover) return;
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            onClick={() => {
              setDropdownOpen(false);
              signOut();
            }}
          >
            ✦ Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
