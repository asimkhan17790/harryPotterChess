// Shared types and constants between client and server

export interface Profile {
  id: string;
  display_name: string;
  house: 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff' | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameRecordPayload {
  house: string;
  game_mode: 'human' | 'ai';
  difficulty: 'easy' | 'medium' | 'hard' | null;
  result: 'win' | 'loss' | 'draw';
  reason: 'checkmate' | 'stalemate' | 'draw';
  move_count: number;
  duration_secs: number;
}

export interface UserStats {
  user_id: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number | null;
}

export type HouseName = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface GameRoom {
  id: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  spectators: string[];
  fen: string;
  status: 'waiting' | 'active' | 'finished';
  createdAt: string;
}

export interface MovePayload {
  roomId: string;
  from: string;
  to: string;
  promotion?: PieceType;
}

export interface SocketError {
  code: string;
  message: string;
}

// Socket event names (single source of truth)
export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_ROOM: 'join_room',
  MAKE_MOVE: 'make_move',
  LEAVE_ROOM: 'leave_room',
  // Server → Client
  ROOM_STATE: 'room_state',
  MOVE_MADE: 'move_made',
  GAME_OVER: 'game_over',
  ERROR: 'error',
} as const;
