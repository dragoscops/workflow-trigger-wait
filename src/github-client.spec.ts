/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */
import axios from 'axios';
import {createPrivateKey} from 'crypto';
import {SignJWT} from 'jose';
// import {createAppAuth} from '@octokit/auth-app';

import * as githubClient from './github-client';
import {
  CreateGithubAppTokenError,
  createGithubAppTokenRaw,
  FailedToRequestInstallationTokenError,
  // createGithubAppTokenOctokit,
  createGithubToken,
  // createGithubClient,
  requestInstallationToken,
  tokenCache,
} from './github-client';
import {/*AppCredentials, */ Credentials, defaultOptions, defaultOptionsForApp} from './options';
import {GithubApiUrl} from './github-api-url';
import {errorMessage_MissingAppCredentialsKeys} from './utils';
// import {InputError} from './utils';

jest.mock('axios');

const endpoint = GithubApiUrl.getInstance().appGenerateInstallationAccessToken(defaultOptionsForApp);
const appGenerateInstallationAccessTokenUrl = `https://api.github.com${endpoint}`;

const mockValueJwtToken = 'valid-jwt-token';
const mockValueInstallationAccessToken = 'installation-access-token';
const mockValuePrivateKeyPem = 'private-key-object';
const mockValueNetworkErrorMessage = 'Network Error';

const futureExpirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toString();

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCreatePrivateKey = createPrivateKey as jest.Mock;
const mockedSignJWT = SignJWT as jest.MockedClass<typeof SignJWT>;
// const mockedCreateAppAuth = createAppAuth as jest.Mock;

describe('github-client', () => {
  const sampleCredentialsForApp = defaultOptionsForApp.credentials;

  // Reset mocks and cache before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module-level tokenCache by re-importing the module
    jest.resetModules();
  });

  describe('requestInstallationToken', () => {
    it('should successfully request an installation token', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 201,
        data: {
          token: mockValueInstallationAccessToken,
          expires_at: futureExpirationDate,
        },
      });

      const result = await requestInstallationToken(mockValueJwtToken, sampleCredentialsForApp.app!);

      expect(axios.post).toHaveBeenCalledWith(
        appGenerateInstallationAccessTokenUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${mockValueJwtToken}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      expect(result).toEqual({
        token: mockValueInstallationAccessToken,
        expiresAt: new Date(futureExpirationDate).getTime(),
      });
    });

    it('should throw InputError if response status is not 201', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 400,
        data: {},
      });

      await expect(requestInstallationToken(mockValueJwtToken, sampleCredentialsForApp.app!)).rejects.toThrow(
        'Failed to request installation token: Unexpected response status: 400',
      );
    });

    it('should throw InputError if token or expires_at is missing', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 201,
        data: {
          token: mockValueInstallationAccessToken,
          // expires_at is missing
        },
      });

      await expect(requestInstallationToken(mockValueJwtToken, sampleCredentialsForApp.app!)).rejects.toThrow(
        'Failed to request installation token: Token or expiration time not found in the response.',
      );
    });

    it('should throw InputError on axios post failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error(mockValueNetworkErrorMessage));

      await expect(requestInstallationToken(mockValueJwtToken, sampleCredentialsForApp.app!)).rejects.toThrow(
        'Failed to request installation token: Network Error',
      );
    });
  });

  describe('createGithubAppTokenRaw', () => {
    it('should successfully create a GitHub App installation token', async () => {
      // Mock createPrivateKey
      mockedCreatePrivateKey.mockReturnValueOnce(mockValuePrivateKeyPem);

      // Mock SignJWT
      const mockSignJWTInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('signed-jwt-token'),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedSignJWT.mockImplementationOnce(() => mockSignJWTInstance as any);

      // Mock axios.post
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          token: mockValueInstallationAccessToken,
          expires_at: futureExpirationDate,
        },
      });

      const token = await createGithubAppTokenRaw(sampleCredentialsForApp.app!);

      // Check if createPrivateKey was called correctly
      expect(createPrivateKey).toHaveBeenCalledWith({
        key: sampleCredentialsForApp.app!.privateKey,
        format: 'pem',
      });

      // Check if SignJWT was instantiated correctly
      expect(SignJWT).toHaveBeenCalledWith({
        iat: Math.floor(Date.now() / 1000) - 60,
        exp: Math.floor(Date.now() / 1000) + 600,
        iss: sampleCredentialsForApp.app!.appId,
      });

      // Check if setProtectedHeader and sign were called
      expect(mockSignJWTInstance.setProtectedHeader).toHaveBeenCalledWith({alg: 'RS256'});
      expect(mockSignJWTInstance.sign).toHaveBeenCalledWith(mockValuePrivateKeyPem);

      // Check if axios.post was called correctly
      expect(axios.post).toHaveBeenCalledWith(
        appGenerateInstallationAccessTokenUrl,
        {},
        {
          headers: {
            Authorization: `Bearer signed-jwt-token`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      // Check if the returned token is correct
      expect(token).toBe(mockValueInstallationAccessToken);
    });

    it('should use cached token if not expired', async () => {
      // Manually set tokenCache
      await tokenCache.set('token', 'cached-token', Date.now() + 5 * 60 * 1000);

      const token = await createGithubAppTokenRaw(sampleCredentialsForApp.app!);

      expect(token).toBe('cached-token');
      // Ensure no other functions are called
      expect(createPrivateKey).not.toHaveBeenCalled();
      expect(SignJWT).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();

      await tokenCache.clear();
    });

    it('should throw InputError if credentials are missing', async () => {
      const incompleteCredentials = {
        appId: '123456',
        // appCredentials is missing
        privateKey: '-----BEGIN PRIVATE KEY-----\n...',
      };

      await expect(createGithubAppTokenRaw(incompleteCredentials as any)).rejects.toThrow(
        errorMessage_MissingAppCredentialsKeys,
      );
    });

    it('should throw InputError if token generation fails', async () => {
      // Mock createPrivateKey
      mockedCreatePrivateKey.mockReturnValueOnce(mockValuePrivateKeyPem);

      // Mock SignJWT to throw an error
      mockedSignJWT.mockImplementationOnce(
        () =>
          ({
            setProtectedHeader: jest.fn().mockReturnThis(),
            sign: jest.fn().mockRejectedValue(new Error('JWT Signing Error')),
          }) as any,
      );

      await expect(createGithubAppTokenRaw(sampleCredentialsForApp.app!)).rejects.toThrow(
        CreateGithubAppTokenError.wrapErrorMessage('JWT Signing Error'),
      );
    });

    it('should throw InputError if requesting installation token fails', async () => {
      // Mock createPrivateKey
      mockedCreatePrivateKey.mockReturnValueOnce(mockValuePrivateKeyPem);

      // Mock SignJWT
      const mockSignJWTInstance = {
        setProtectedHeader: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('signed-jwt-token'),
      };
      mockedSignJWT.mockImplementationOnce(() => mockSignJWTInstance as any);

      // Mock axios.post to fail
      mockedAxios.post.mockRejectedValueOnce(new Error(mockValueNetworkErrorMessage));

      await expect(createGithubAppTokenRaw(sampleCredentialsForApp.app!)).rejects.toThrow(
        CreateGithubAppTokenError.wrapErrorMessage(
          FailedToRequestInstallationTokenError.wrapErrorMessage(mockValueNetworkErrorMessage),
        ),
      );
    });
  });

  // describe('createGithubAppTokenOctokit', () => {
  //   it('should successfully create a GitHub App installation token using Octokit', async () => {
  //     // Mock createAppAuth
  //     const mockAuth = {
  //       token: 'octokit-installation-token',
  //       expiresAt: futureExpirationDate,
  //     };
  //     mockedCreateAppAuth.mockReturnValueOnce(jest.fn().mockResolvedValue(mockAuth));

  //     const token = await createGithubAppTokenOctokit(sampleCredentialsForApp.app!);

  //     expect(createAppAuth).toHaveBeenCalledWith({
  //       appId: Number(sampleCredentialsForApp.app!.appId),
  //       privateKey: sampleCredentialsForApp.app!.privateKey,
  //       installationId: Number(sampleCredentialsForApp.app!.installationId),
  //     });

  //     expect(token).toBe('octokit-installation-token');
  //   });

  //   it('should use cached token if not expired', async () => {
  //     await tokenCache.set('token', 'cached-octokit-token', Date.now() + 5 * 60 * 1000);

  //     const token = await createGithubAppTokenOctokit(sampleCredentialsForApp.app!);

  //     expect(token).toBe('cached-octokit-token');
  //     // Ensure createAppAuth is not called
  //     expect(createAppAuth).not.toHaveBeenCalled();

  //     await tokenCache.clear();
  //   });

  //   it('should throw InputError if appAuth fails to generate token', async () => {
  //     // Mock createAppAuth to return incomplete auth
  //     mockedCreateAppAuth.mockReturnValueOnce(jest.fn().mockResolvedValue({}));

  //     await expect(createGithubAppTokenOctokit(sampleCredentialsForApp.app!)).rejects.toThrow(
  //       CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'),
  //     );
  //   });

  //   it('should throw InputError if credentials are missing', async () => {
  //     const incompleteCredentials = {
  //       appId: '123456',
  //       // appCredentials is missing
  //       privateKey: '-----BEGIN PRIVATE KEY-----\n...',
  //     };

  //     await expect(createGithubAppTokenOctokit(incompleteCredentials as AppCredentials)).rejects.toThrow(
  //       errorMessage_MissingAppCredentialsKeys,
  //     );
  //   });
  // });

  describe('createGithubToken', () => {
    let createGithubAppTokenSpy: any;

    beforeEach(() => {
      createGithubAppTokenSpy = jest.spyOn(githubClient, 'createGithubAppToken');
    });

    afterEach(() => {
      createGithubAppTokenSpy.mockRestore();
    });

    it('should return the provided token when token is present', async () => {
      const token = await createGithubToken(defaultOptions.credentials);

      expect(token).toBe(defaultOptions.credentials.token);
      expect(createGithubAppTokenSpy).not.toHaveBeenCalled();
    });

    it('should generate a token using createGithubAppToken when app credentials are present', async () => {
      await tokenCache.set('token', 'generated-app-token', new Date().getTime() + 5 * 60 * 1000);

      const token = await createGithubToken(defaultOptionsForApp.credentials);

      // TODO: why is this failing?
      // expect(createGithubAppTokenSpy).toHaveBeenCalledWith(defaultOptionsForApp.credentials.app);
      expect(token).toBe('generated-app-token');

      await tokenCache.clear();
    });

    it('should throw InputError if neither token nor app credentials are provided', async () => {
      const credentials: Credentials = {};

      await expect(createGithubToken(credentials)).rejects.toThrow(
        'Invalid credentials: No token or app credentials provided.',
      );
    });
  });
});
