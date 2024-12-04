/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */

import {describe, it, expect, beforeEach, vi, beforeAll} from 'vitest';
import axios, {AxiosInstance} from 'axios';
import {createAppAuth, InstallationAccessTokenAuthentication} from '@octokit/auth-app';
import {request} from '@octokit/request';
import pRetry from 'p-retry';

import {GithubClient, CreateGithubAppTokenError} from './github-client.js';
import {defaultOptionsForApp} from './options.js';
import {InputError, GenericError, errorMessage} from './utils.js';

const mockAuthentication = {
  token: 'new-octokit-token',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
} as unknown as InstallationAccessTokenAuthentication;

// Mock createAppAuth to return a mock auth function
const mockAuthFn = vi.fn().mockResolvedValue(mockAuthentication) as unknown as ReturnType<typeof createAppAuth>;
const mockedCreateAppAuth = vi.fn(() => mockAuthFn) as typeof createAppAuth;

// Mock createAppAuth
vi.mock('@octokit/auth-app', () => ({
  ...vi.importActual('@octokit/auth-app'),
  createAppAuth: vi.fn(() => mockedCreateAppAuth),
}));

const mockResponseReturn = {
  data: {
    id: 'installation-id-from-owner',
  },
};

// Mock request
vi.mock('@octokit/request', () => ({
  ...vi.importActual('@octokit/request'),
  request: vi.fn(() => mockResponseReturn),
}));

// // Mock Axios.create
// const mockAxiosInstance = {} as AxiosInstance;
// vi.mock('axios', () => ({
//   ...vi.importActual('axios'),
//   create: vi.fn(() => mockAxiosInstance),
// }));

describe('GithubClient', () => {
  let githubClient: GithubClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // // Reset the cache mock
    // const mockCache = mockedCreateCache();
    // mockCache.get.mockReset();
    // mockCache.set.mockReset();
    // mockCache.clear.mockReset();

    // Initialize GithubClient instance
    githubClient = GithubClient.instance(defaultOptionsForApp);
  });

  describe('create()', () => {
    it('should create an Axios instance with the provided token', async () => {
      // Mock createToken method
      const createTokenSpy = vi.spyOn(githubClient, 'createToken').mockResolvedValueOnce(mockAuthentication.token);
      const axiosCreateSpy = vi.spyOn(axios, 'create');

      const axiosInstance = await githubClient.create();

      expect(createTokenSpy).toHaveBeenCalledTimes(1);
      expect(axiosCreateSpy).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${mockAuthentication.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      // expect(axiosInstance instanceof AxiosInstance).toBeTruthy();
    });

    it('should throw InputError if neither token nor app credentials are provided', async () => {
      const invalidOptions = {
        ...defaultOptionsForApp,
        credentials: {},
      };

      const client = GithubClient.instance(invalidOptions);

      await expect(client.create()).rejects.toThrow(InputError);
    });
  });

  describe('createToken()', () => {
    it('should return the provided token when credentials include a token', async () => {
      const mockToken = 'personal-access-token';
      const optionsWithToken = {
        ...defaultOptionsForApp,
        credentials: {
          token: mockToken,
        },
      };
      const token = await GithubClient.instance(optionsWithToken).createToken();

      expect(token).toBe(mockToken);
    });

    it('should return the provided token when credentials include a token', async () => {
      const mockToken = 'personal-access-token';

      const githubClient = GithubClient.instance(defaultOptionsForApp);

      vi.spyOn(githubClient, 'createAppToken').mockResolvedValueOnce(mockToken);

      const token = await githubClient.createToken();

      expect(token).toBe(mockToken);
    });

    it('should throw InputError if neither token nor app credentials are provided', async () => {
      const invalidOptions = {
        ...defaultOptionsForApp,
        credentials: {},
      };
      const client = GithubClient.instance(invalidOptions);

      await expect(client.createToken()).rejects.toThrow(InputError);
    });
  });

  describe('createAppToken()', () => {
    it('should return cached token if available', async () => {
      const cachedToken = 'cached-octokit-token';

      vi.spyOn(githubClient['tokenCache'], 'get').mockResolvedValueOnce(cachedToken);

      const token = await githubClient.createAppToken();

      expect(githubClient['tokenCache'].get).toHaveBeenCalledWith('token');
      expect(token).toBe(cachedToken);
    });

    it('should create a new token and cache it', async () => {
      // Mock tokenCache.get to return undefined (no cached token)
      vi.spyOn(githubClient['tokenCache'], 'get').mockResolvedValueOnce(undefined);
      vi.spyOn(githubClient['tokenCache'], 'set');

      vi.spyOn(githubClient, 'authenticateApp').mockResolvedValueOnce(mockAuthentication);

      const token = await githubClient.createAppToken();

      expect(githubClient['tokenCache'].get).toHaveBeenCalledWith('token');
      expect(createAppAuth).toHaveBeenCalledWith({
        appId: Number(defaultOptionsForApp.credentials.app!.appId),
        privateKey: defaultOptionsForApp.credentials.app!.privateKey,
        request,
      });
      expect(token).toBe(mockAuthentication.token);
      // Ensure token is cached with correct TTL
      expect(githubClient['tokenCache'].set).toHaveBeenCalledWith(
        'token',
        mockAuthentication.token,
        expect.any(Number),
      );
    });

    it('should throw CreateGithubAppTokenError if auth fails to generate token', async () => {
      // Mock tokenCache.get to return undefined (no cached token)
      vi.spyOn(githubClient['tokenCache'], 'get').mockResolvedValueOnce(undefined);
      vi.spyOn(githubClient['tokenCache'], 'set');

      vi.spyOn(githubClient, 'authenticateApp').mockResolvedValueOnce(
        {} as unknown as InstallationAccessTokenAuthentication,
      );

      await expect(githubClient.createAppToken()).rejects.toThrow(
        CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'),
      );
    });
  });

  describe('authenticateApp()', () => {
    it('should authenticate using installationId if provided', async () => {
      const optionsWithInstallationId = {
        ...defaultOptionsForApp,
        credentials: {
          app: {
            ...defaultOptionsForApp.credentials.app!,
            installationId: '123456',
          },
        },
      };

      const githubClient = GithubClient.instance(optionsWithInstallationId);

      const authentication = await githubClient.authenticateApp(mockAuthFn, request);

      expect(mockAuthFn).toHaveBeenCalledWith({type: 'installation', installationId: '123456'});
      expect(authentication).toEqual(mockAuthentication);
    });

    it('should authenticate by owner and repository if installationId is not provided', async () => {
      const optionsWithoutInstallationId = {
        ...defaultOptionsForApp,
        credentials: {
          app: {
            ...defaultOptionsForApp.credentials.app!,
            installationId: '',
            owner: 'test-owner',
            repositories: ['test-repo'],
          },
        },
      };
      const githubClient = GithubClient.instance(optionsWithoutInstallationId);
      const authentication = await githubClient.authenticateApp(mockAuthFn, request);

      expect(request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/installation', {
        owner: 'test-owner',
        repo: 'test-repo',
        request: {hook: undefined},
      });

      expect(mockAuthFn).toHaveBeenCalledWith({
        type: 'installation',
        installationId: mockResponseReturn.data.id,
      });

      expect(authentication).toEqual(mockAuthentication);
    });
  });

  describe('authenticateAppByOwnerAndRepository()', () => {
    it('should authenticate by owner and repository successfully', async () => {
      const options = {
        ...defaultOptionsForApp,
        credentials: {
          app: {
            ...defaultOptionsForApp.credentials.app!,
            installationId: '',
            owner: 'test-owner',
            repositories: ['test-repo'],
          },
        },
      };

      const githubClient = GithubClient.instance(options);
      const result = await githubClient.authenticateAppByOwnerAndRepository(mockAuthFn, request);

      expect(request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/installation', {
        owner: 'test-owner',
        repo: 'test-repo',
        request: {hook: undefined},
      });

      expect(mockAuthFn).toHaveBeenCalledWith({
        type: 'installation',
        installationId: 'installation-id-from-owner',
      });

      expect(result).toEqual(mockAuthentication);
    });

    it('should handle missing owner by defaulting to environment repository', async () => {
      // Mock process.env.GITHUB_REPOSITORY
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...process.env,
          GITHUB_REPOSITORY: 'env-owner/env-repo',
        },
      });

      const options = {
        ...defaultOptionsForApp,
        credentials: {
          app: {
            ...defaultOptionsForApp.credentials.app!,
            installationId: '',
            owner: undefined,
            repositories: [],
          },
        },
      };
      const githubClient = GithubClient.instance(options);

      const result = await githubClient.authenticateAppByOwnerAndRepository(mockAuthFn, request);

      expect(request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/installation', {
        owner: 'env-owner',
        repo: 'env-repo',
        request: {hook: undefined},
      });

      expect(mockAuthFn).toHaveBeenCalledWith({
        type: 'installation',
        installationId: 'installation-id-from-owner',
      });

      expect(result).toEqual(mockAuthentication);

      // Restore process.env
      vi.unstubAllGlobals();
    });
  });
});
