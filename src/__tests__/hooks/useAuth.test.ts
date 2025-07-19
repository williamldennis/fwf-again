// @jest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import useAuth from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';

jest.mock('../../utils/supabase');

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock onAuthStateChange
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
  });

  it('should return user and userId when authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual({ id: 'user-123', email: 'test@example.com' });
    expect(result.current.currentUserId).toBe('user-123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return nulls and isAuthenticated false when not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.currentUserId).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors from supabase', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Auth error' },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.currentUserId).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Auth error');
  });

  it('should set up auth state change listener', () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderHook(() => useAuth());

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
}); 