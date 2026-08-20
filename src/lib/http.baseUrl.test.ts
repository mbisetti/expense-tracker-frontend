import { afterEach, describe, expect, it, vi } from 'vitest';

// La base de la API se resuelve UNA vez, al cargar el módulo. Por eso cada caso recarga
// `http.ts` de cero con su propio entorno y su propio mock de plataforma.
async function loadHttp(options: {
  native: boolean;
  apiUrl?: string;
  nativeOrigin?: string;
}) {
  vi.resetModules();
  vi.doMock('./platform', () => ({
    isNative: () => options.native,
    getPlatform: () => (options.native ? 'android' : 'web'),
    isNativeIos: () => false,
    isNativeAndroid: () => options.native,
  }));
  vi.stubEnv('VITE_API_URL', options.apiUrl);
  vi.stubEnv('VITE_NATIVE_API_ORIGIN', options.nativeOrigin);
  return await import('./http');
}

function stubFetch() {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      urls.push(url);
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );
  return urls;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock('./platform');
});

describe('base de la API según la plataforma', () => {
  it('en la web queda relativa, igual que la topología same-origin de S9', async () => {
    const urls = stubFetch();
    const { http } = await loadHttp({ native: false, apiUrl: '/api/v1' });

    await http('/users/me');

    expect(urls[0]).toBe('/api/v1/users/me');
  });

  it('en nativo le antepone el origen absoluto: una ruta relativa pegaría contra el bundle local', async () => {
    const urls = stubFetch();
    const { http } = await loadHttp({
      native: true,
      apiUrl: '/api/v1',
      nativeOrigin: 'https://expense-tracker-marko.up.railway.app',
    });

    await http('/users/me');

    expect(urls[0]).toBe('https://expense-tracker-marko.up.railway.app/api/v1/users/me');
  });

  it('no duplica la barra si el origen viene con una al final', async () => {
    const urls = stubFetch();
    const { http } = await loadHttp({
      native: true,
      apiUrl: '/api/v1',
      nativeOrigin: 'https://api.ejemplo.com/',
    });

    await http('/users/me');

    expect(urls[0]).toBe('https://api.ejemplo.com/api/v1/users/me');
  });

  it('si VITE_API_URL ya es absoluta la respeta (probar en un teléfono contra la máquina de dev)', async () => {
    const urls = stubFetch();
    const { http } = await loadHttp({
      native: true,
      apiUrl: 'http://192.168.0.10:8080/api/v1',
      nativeOrigin: 'https://no-se-usa.ejemplo.com',
    });

    await http('/users/me');

    expect(urls[0]).toBe('http://192.168.0.10:8080/api/v1/users/me');
  });

  it('un build nativo sin origen falla al cargar, y no con un 404 por pantalla', async () => {
    await expect(loadHttp({ native: true, apiUrl: '/api/v1' })).rejects.toThrow(
      /VITE_NATIVE_API_ORIGIN/,
    );
  });
});
