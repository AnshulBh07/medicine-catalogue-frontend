import { ApiError, apiClient } from '../src/services/api-client';

describe('ApiClient Foundation', () => {
  beforeEach(() => {
    apiClient.setToken(null);
    jest.restoreAllMocks();
  });

  it('attaches Bearer authorization header when token is set', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (header: string) => (header === 'content-type' ? 'application/json' : null),
      },
      json: () => Promise.resolve({ status: 'ok' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    apiClient.setToken('test-jwt-token');
    const result = await apiClient.get<{ status: string }>('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
        }),
      }),
    );
    expect(result).toEqual({ status: 'ok' });
  });

  it('falls back to storage.getToken when in-memory token is unset', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (header: string) => (header === 'content-type' ? 'application/json' : null),
      },
      json: () => Promise.resolve({ success: true }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    apiClient.setToken(null);
    const { storage } = jest.requireActual('../src/lib/storage');
    jest.spyOn(storage, 'getToken').mockResolvedValue('persisted-storage-token');

    const result = await apiClient.post<{ success: boolean }>('/attendance', { status: 'LEAVE' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/attendance'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer persisted-storage-token',
        }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('maps backend ApiError responses with status code and error details', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: {
        get: (header: string) => (header === 'content-type' ? 'application/json' : null),
      },
      json: () =>
        Promise.resolve({
          error: {
            code: 'DUPLICATE_BARCODE',
            message: 'A medicine with this barcode already exists',
          },
        }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(apiClient.post('/medicines', {})).rejects.toThrow(ApiError);
    await expect(apiClient.post('/medicines', {})).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_BARCODE',
      message: 'A medicine with this barcode already exists',
    });
  });

  it('handles network failure with 0 status code and NETWORK_ERROR code', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Failed to connect'));
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      statusCode: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('does NOT trigger onUnauthorizedCallback when /auth/login returns 401', async () => {
    const onUnauthorized = jest.fn();
    apiClient.setOnUnauthorized(onUnauthorized);

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: {
        get: (h: string) => (h === 'content-type' ? 'application/json' : null),
      },
      json: () =>
        Promise.resolve({
          error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid identifier or password' },
        }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(
      apiClient.post('/auth/login', { identifier: 'bad@user.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_FAILED',
    });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('verifies session and does NOT logout on transient 401 when token is valid and retries request', async () => {
    const onUnauthorized = jest.fn();
    apiClient.setOnUnauthorized(onUnauthorized);

    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payloadBase64 = Buffer.from(JSON.stringify({ sub: 'user-1', exp: validExp })).toString('base64');
    const validToken = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

    apiClient.setToken(validToken);

    let callCount = 0;
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes('/users/me')) {
        // Verification succeeds -> session is still active!
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ user: { id: 'user-1' } }),
        });
      }
      if (callCount === 1) {
        // First call to /medicines returns a transient 401
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED', message: 'Auth required' } }),
        });
      }
      // Retry call succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ medicines: [{ id: 'med-1' }] }),
      });
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await apiClient.get<{ medicines: unknown[] }>('/medicines');

    expect(result).toEqual({ medicines: [{ id: 'med-1' }] });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('triggers onUnauthorizedCallback when token is expired by JWT timestamp', async () => {
    const onUnauthorized = jest.fn();
    apiClient.setOnUnauthorized(onUnauthorized);

    const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const payloadBase64 = Buffer.from(JSON.stringify({ sub: 'user-1', exp: expiredTimestamp })).toString('base64');
    const expiredToken = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

    apiClient.setToken(expiredToken);

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED', message: 'Token expired' } }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(apiClient.get('/medicines')).rejects.toThrow(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('refreshes last active timestamp on successful authenticated requests', async () => {
    const { storage } = jest.requireActual('../src/lib/storage');
    const setLastActiveSpy = jest.spyOn(storage, 'setLastActiveTime');

    const validExp = Math.floor(Date.now() / 1000) + 3600;
    const payloadBase64 = Buffer.from(JSON.stringify({ sub: 'user-1', exp: validExp })).toString('base64');
    const validToken = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

    apiClient.setToken(validToken);

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: 'ok' }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await apiClient.get('/medicines');
    expect(setLastActiveSpy).toHaveBeenCalled();
  });
});
