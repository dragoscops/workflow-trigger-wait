// import {createAppAuth} from '@octokit/auth-app';
import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import {createPrivateKey} from 'crypto';
import {SignJWT} from 'jose';
import {doDebug, errorMessage, errorMessage_MissingAppCredentialsKeys, GenericError, InputError} from './utils';
import {createCache} from 'cache-manager';
import Keyv from 'keyv';
import {GithubApiUrl} from './github-api-url';
import {AppCredentials, Credentials, Options} from './options';

export const tokenCache = createCache({
  stores: [new Keyv()],
});

export class FailedToRequestInstallationTokenError extends GenericError {
  runConclusion = 'failed_to_request_app_token';

  static wrapErrorMessage(error: unknown) {
    return `Failed to request installation token: ${errorMessage(error)}`;
  }
}

export async function requestInstallationToken(
  jwtToken: string,
  credentials: AppCredentials,
): Promise<{token: string; expiresAt: number}> {
  const endpoint = GithubApiUrl.getInstance().appGenerateInstallationAccessToken({
    credentials: {app: credentials},
  } as Options);
  const url = `https://api.github.com${endpoint}`;

  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  };

  try {
    const response = await axios.post(url, {}, config);

    if (response.status !== 201) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const {token, expires_at} = response.data;
    if (!token || !expires_at) {
      throw new Error('Token or expiration time not found in the response.');
    }

    return {
      token,
      expiresAt: new Date(expires_at).getTime(),
    };
  } catch (error) {
    throw new FailedToRequestInstallationTokenError(FailedToRequestInstallationTokenError.wrapErrorMessage(error), {
      cause: error,
    });
  }
}

export class CreateGithubAppTokenError extends GenericError {
  runConclusion = 'failed_to_create_github_app_token';

  static wrapErrorMessage(error: unknown) {
    return `Failed to generate Github App Token: ${errorMessage(error)}`;
  }
}

/**
 * Create a GitHub App installation token.
 * Utilizes caching to avoid unnecessary token generation.
 *
 * @param credentials - The GitHub App credentials.
 * @returns A valid GitHub installation token.
 */
export async function createGithubAppTokenRaw(credentials: AppCredentials): Promise<string> {
  const {appId, installationId, privateKey} = credentials;
  if (!appId || !installationId || !privateKey) {
    throw new InputError(errorMessage_MissingAppCredentialsKeys);
  }

  const tokenValue = await tokenCache.get<string>('token');
  if (tokenValue) {
    return tokenValue;
  }

  // Generate a new JWT using jose
  const key = createPrivateKey({
    key: privateKey.replace(/\\n/g, '\n'),
    format: 'pem',
  });

  try {
    const now = Date.now();
    const jwt = await new SignJWT({
      iat: Math.floor(now / 1000) - 60, // Issued at time (60 seconds in the past to account for clock drift)
      exp: Math.floor(now / 1000) + 600, // Expiration time (10 minutes)
      iss: appId, // GitHub App's identifier
    })
      .setProtectedHeader({alg: 'RS256'})
      .sign(key);
    // Request a new installation access token
    const {token, expiresAt} = await requestInstallationToken(jwt, credentials);
    // set a 1 minute less expiration time for the cache
    tokenCache.set('token', token, expiresAt - 60 * 1000);

    return token;
  } catch (error) {
    throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage(error), {cause: error});
  }
}

// /**
//  * Create a GitHub App installation token using Octokit.
//  *
//  * @param credentials - The GitHub App credentials.
//  * @returns A valid GitHub installation token.
//  */
// export async function createGithubAppTokenOctokit(credentials: AppCredentials): Promise<string> {
//   const {appId, installationId, privateKey} = credentials;
//   if (!appId || !installationId || !privateKey) {
//     throw new InputError(errorMessage_MissingAppCredentialsKeys);
//   }

//   // Check if a valid token is already cached
//   const token = await tokenCache.get<string>('token');
//   if (token) {
//     return token;
//   }

//   // Initialize Octokit with App authentication
//   const auth = createAppAuth({
//     appId: Number(appId), // Ensure appId is a number
//     privateKey,
//     installationId: Number(installationId), // Ensure installationId is a number
//   });

//   // Authenticate as the installation and get the token
//   const authentication = await auth({type: 'installation'});
//   if (!authentication.token || !authentication.expiresAt) {
//     throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
//   }
//   // set a 1 minute less expiration time for the cache
//   tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);

//   return authentication.token;
// }

export async function createGithubAppToken(credentials: AppCredentials): Promise<string> {
  return createGithubAppTokenRaw(credentials);
}

export async function createGithubToken(credentials: Credentials): Promise<string> {
  let token: string;
  if (credentials.token) {
    doDebug({credentials} as Options, '[createGithubToken(token)]');
    token = credentials.token; // Use the provided token
  } else if (credentials.app) {
    doDebug({credentials} as Options, '[createGithubToken(appp)]');
    token = await createGithubAppToken(credentials.app); // Placeholder for token generation logic
  } else {
    throw new InputError('Invalid credentials: No token or app credentials provided.');
  }

  return token;
}

export async function createGithubClient(credentials: Credentials): Promise<AxiosInstance> {
  const token = await createGithubToken(credentials);
  doDebug({} as Options, '[createGithubClient]', token);
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}
