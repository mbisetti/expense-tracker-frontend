import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthContext } from './context';
import { refreshAccessToken } from './refreshManager';
import { useHttp } from '../../lib/useHttp';
import { jsonResponse } from '../../test/mockResponse';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('refreshAccessToken (single-flight)', () => {
  it('dos llamadas concurrentes comparten un solo POST /auth/refresh', async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(200, { accessToken: 'fresh-token' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(a).toBe('fresh-token');
    expect(b).toBe('fresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve null si el refresh falla (cookie vencida)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' })),
    );

    expect(await refreshAccessToken()).toBeNull();
  });
});

describe('useHttp (silent refresh on 401)', () => {
  function setup(fetchMock: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('fetch', fetchMock);
    const setAccessToken = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider
        value={{ accessToken: 'expired-token', status: 'authenticated', setAccessToken }}
      >
        {children}
      </AuthContext.Provider>
    );
    const { result } = renderHook(() => useHttp(), { wrapper });
    return { http: result.current, setAccessToken };
  }

  it('401 → refresh → retry con el token nuevo, transparente para el llamador', async () => {
    const calls: { url: string; auth?: string }[] = [];
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      const auth = (options?.headers as Record<string, string>)?.Authorization;
      calls.push({ url, auth });
      if (url.includes('/auth/refresh')) {
        return jsonResponse(200, { accessToken: 'new-token' });
      }
      if (auth === 'Bearer new-token') {
        return jsonResponse(200, [{ id: 'acc-1' }]);
      }
      return jsonResponse(401, { error: 'UNAUTHORIZED' });
    });

    const { http, setAccessToken } = setup(fetchMock);
    const data = await http<{ id: string }[]>('/accounts');

    expect(data).toEqual([{ id: 'acc-1' }]);
    expect(setAccessToken).toHaveBeenCalledWith('new-token');
    expect(calls.map((c) => c.url.replace(/^.*\/api\/v1/, ''))).toEqual([
      '/accounts',
      '/auth/refresh',
      '/accounts',
    ]);
  });

  it('si el refresh falla, limpia la sesión y propaga el 401 original', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/auth/refresh')) {
        return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      }
      return jsonResponse(401, { error: 'UNAUTHORIZED' });
    });

    const { http, setAccessToken } = setup(fetchMock);

    await expect(http('/accounts')).rejects.toMatchObject({ status: 401 });
    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  it('un 401 en /auth/* NO dispara refresh (credencial inválida, no token vencido)', async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(401, { error: 'INVALID_CREDENTIALS' }),
    );

    const { http } = setup(fetchMock);

    await expect(
      http('/auth/login', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('errores que no son 401 pasan directo, sin refresh', async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(422, { error: 'INSUFFICIENT_BALANCE' }),
    );

    const { http } = setup(fetchMock);

    await expect(http('/transactions', { method: 'POST' })).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
