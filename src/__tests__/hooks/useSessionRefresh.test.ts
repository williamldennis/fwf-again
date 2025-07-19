// @jest-environment jsdom
import { renderHook } from '@testing-library/react';
import { AppState } from 'react-native';
import { useSessionRefresh } from '../../hooks/useSessionRefresh';
import { supabase } from '../../utils/supabase';

jest.mock('../../utils/supabase');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() }))
  }
}));

describe('useSessionRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set up app state change listener', () => {
    renderHook(() => useSessionRefresh());

    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should handle app coming to foreground', async () => {
    const mockEventListener = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockEventListener });

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { id: 'test-user' },
          expires_at: Date.now() + 60000 // expires in 1 minute
        } 
      },
      error: null
    });

    renderHook(() => useSessionRefresh());

    // Get the callback function that was passed to addEventListener
    const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate app coming to foreground
    await callback('active');

    expect(supabase.auth.getSession).toHaveBeenCalled();
  });

  it('should refresh session when token expires soon', async () => {
    const mockEventListener = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockEventListener });

    // Mock session that expires in 2 minutes (less than 5 minutes threshold)
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { id: 'test-user' },
          expires_at: Date.now() + 120000 // expires in 2 minutes
        } 
      },
      error: null
    });

    (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'test-user' } } },
      error: null
    });

    renderHook(() => useSessionRefresh());

    // Get the callback function that was passed to addEventListener
    const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate app coming to foreground
    await callback('active');

    expect(supabase.auth.refreshSession).toHaveBeenCalled();
  });

  it('should not refresh session when token is still valid', async () => {
    const mockEventListener = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockEventListener });

    // Mock session that expires in 10 minutes (more than 5 minutes threshold)
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: { 
          user: { id: 'test-user' },
          expires_at: Date.now() + 600000 // expires in 10 minutes
        } 
      },
      error: null
    });

    renderHook(() => useSessionRefresh());

    // Get the callback function that was passed to addEventListener
    const callback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    
    // Simulate app coming to foreground
    await callback('active');

    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });
}); 