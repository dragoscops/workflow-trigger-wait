/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */

import {createAppAuth, InstallationAccessTokenAuthentication} from '@octokit/auth-app';
import {request} from '@octokit/request';

import axios from 'axios';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {GithubAxios, CreateGithubAppTokenError} from './axios.js';
import {defaultOptionsForApp} from '../options.js';
import {InputError} from '../utils.js';

const requestByRepositoryInstallationUrl = 'GET /repos/{owner}/{repo}/installation';
const requestByOwnerInstallationUrl = 'GET /users/{owner}/installation';

const mockTestOwner = 'test-owner';
const mockTestRepo = 'test-repo';

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

describe('GithubClient', () => {
  let githubClient: GithubAxios;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize GithubClient instance
    githubClient = GithubAxios.instance(defaultOptionsForApp);
  });

  describe('create()', () => {
    it('should create an Axios instance with the provided token', async () => {
      // Mock createToken method
      const createTokenSpy = vi.spyOn(githubClient, 'createToken').mockResolvedValueOnce(mockAuthentication.token);
      const axiosCreateSpy = vi.spyOn(axios, 'create');

      await githubClient.create();

      expect(createTokenSpy).toHaveBeenCalledTimes(1);
      expect(axiosCreateSpy).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `Bearer ${mockAuthentication.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    });

    it('should throw InputError if neither token nor app credentials are provided', async () => {
      const invalidOptions = {
        ...defaultOptionsForApp,
        credentials: {},
      };

      const client = GithubAxios.instance(invalidOptions);

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
      const token = await GithubAxios.instance(optionsWithToken).createToken();

      expect(token).toBe(mockToken);
    });

    it('should return the provided token when credentials include app settings', async () => {
      const mockToken = 'personal-access-token';

      const githubClient = GithubAxios.instance(defaultOptionsForApp);

      vi.spyOn(githubClient, 'createAppToken').mockResolvedValueOnce(mockToken);

      const token = await githubClient.createToken();

      expect(token).toBe(mockToken);
    });

    it('should throw InputError if neither token nor app credentials are provided', async () => {
      const invalidOptions = {
        ...defaultOptionsForApp,
        credentials: {},
      };
      const client = GithubAxios.instance(invalidOptions);

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

      const githubClient = GithubAxios.instance(optionsWithInstallationId);

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
            owner: mockTestOwner,
            repositories: [],
          },
        },
      };
      const githubClient = GithubAxios.instance(optionsWithoutInstallationId);
      const authentication = await githubClient.authenticateApp(mockAuthFn, request);

      expect(request).toHaveBeenCalledWith(requestByOwnerInstallationUrl, {
        owner: mockTestOwner,
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
            owner: mockTestOwner,
            repositories: [mockTestRepo],
          },
        },
      };

      const githubClient = GithubAxios.instance(options);
      const result = await githubClient.authenticateAppByOwnerAndRepository(mockAuthFn, request);

      expect(request).toHaveBeenCalledWith(requestByRepositoryInstallationUrl, {
        owner: mockTestOwner,
        repo: mockTestRepo,
        request: {hook: undefined},
      });

      expect(mockAuthFn).toHaveBeenCalledWith({
        type: 'installation',
        installationId: mockResponseReturn.data.id,
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
      const githubClient = GithubAxios.instance(options);

      const result = await githubClient.authenticateAppByOwnerAndRepository(mockAuthFn, request);

      expect(request).toHaveBeenCalledWith(requestByRepositoryInstallationUrl, {
        owner: 'env-owner',
        repo: 'env-repo',
        request: {hook: undefined},
      });

      expect(mockAuthFn).toHaveBeenCalledWith({
        type: 'installation',
        installationId: mockResponseReturn.data.id,
      });

      expect(result).toEqual(mockAuthentication);

      // Restore process.env
      vi.unstubAllGlobals();
    });
  });
});
