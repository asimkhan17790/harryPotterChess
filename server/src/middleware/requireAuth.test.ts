import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock supabaseAdmin before importing requireAuth
vi.mock('../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

import { requireAuth } from './requireAuth';
import { supabaseAdmin } from '../lib/supabaseAdmin';

function makeReq(authHeader?: string): Partial<Request> {
  return { headers: authHeader ? { authorization: authHeader } : {} } as Partial<Request>;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
}

describe('requireAuth middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when Authorization header is absent', async () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', async () => {
    const req = makeReq('Basic token123');
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Supabase returns an error', async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' } as any,
    });
    const req = makeReq('Bearer bad-token');
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.userId on valid token', async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });
    const req = makeReq('Bearer valid-token') as any;
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('user-123');
  });
});
