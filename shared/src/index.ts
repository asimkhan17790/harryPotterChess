// Shared types and constants between client and server

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
