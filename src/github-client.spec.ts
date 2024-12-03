// github-client.test.ts

import {createAppAuth} from '@octokit/auth-app';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {createGithubToken} from './github-client.js';
import {Credentials, AppCredentials} from './options.js';

// Mock dependencies using Vitest
vi.mock('axios');
vi.mock('@octokit/auth-app', () => ({
  createAppAuth: vi.fn(),
}));

const mockedCreateAppAuth = vi.mocked(createAppAuth, true);

describe('createGithubToken', () => {
  const defaultAppCredentials: AppCredentials = {
    appId: '123456',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...IDAQAB\n-----END PRIVATE KEY-----',
  };

  const defaultCredentialsWithToken: Credentials = {
    token: 'personal-access-token',
  };

  const defaultCredentialsWithApp: Credentials = {
    app: defaultAppCredentials,
  };

  // Reset mocks and cache before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module-level tokenCache by re-importing the module
    vi.resetModules();
  });

  it('should return the provided token when token is present', async () => {
    const token = await createGithubToken(defaultCredentialsWithToken);

    expect(token).toBe(defaultCredentialsWithToken.token);
    expect(mockedCreateAppAuth).not.toHaveBeenCalled();
  });

  it('should generate a token using createGithubAppToken when app credentials are provided', async () => {
    const mockAuth = {token: 'generated-app-token', expiresAt: '2024-12-31T23:59:59Z'};
    mockedCreateAppAuth.mockReturnValueOnce(vi.fn().mockResolvedValue(mockAuth));

    const token = await createGithubToken(defaultCredentialsWithApp);

    expect(token).toBe('generated-app-token');
    expect(mockedCreateAppAuth).toHaveBeenCalledTimes(1);
    expect(mockedCreateAppAuth).toHaveBeenCalledWith({
      ...defaultAppCredentials,
      appId: Number(defaultAppCredentials.appId),
    });
  });

  it('should throw InputError if neither token nor app credentials are provided', async () => {
    const invalidCredentials: Credentials = {};

    await expect(createGithubToken(invalidCredentials)).rejects.toThrow(
      'Invalid credentials: No token or app credentials provided.',
    );
  });
});
