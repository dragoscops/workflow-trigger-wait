import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import {createPrivateKey} from 'crypto';
import {SignJWT} from 'jose';

import {errorMessage, InputError} from './utils';

type TokenCache = {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
};

// Module-level cache for the installation token
let tokenCache: TokenCache | null = null;

export type AppCredentials = {
  appId: string;
  installationId: string;
  privateKey: string;
};

/**
 * Request an installation access token from GitHub.
 *
 * @param jwtToken - The generated JWT for authentication.
 * @param installationId - Installation ID of the GitHub App.
 * @returns An object containing the access token and its expiration time.
 */
async function requestInstallationToken(
  jwtToken: string,
  installationId: string,
): Promise<{token: string; expiresAt: number}> {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

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
    throw new InputError(`Failed to request installation token: ${errorMessage(error)}`);
  }
}

/**
 * Create a GitHub App installation token.
 * Utilizes caching to avoid unnecessary token generation.
 *
 * @param credentials - The GitHub App credentials.
 * @returns A valid GitHub installation token.
 */
export async function createGithubAppToken(credentials: AppCredentials): Promise<string> {
  const {appId, installationId, privateKey} = credentials;

  // Validate credentials
  if (!appId || !installationId || !privateKey) {
    throw new InputError('Missing appId, installationId, or privateKey in AppCredentials.');
  }

  const now = Date.now();

  // Check if a valid token is already cached (with a 1-minute buffer)
  if (tokenCache && tokenCache.expiresAt > now + 60 * 1000) {
    return tokenCache.token;
  }

  // Generate a new JWT using jose
  const key = createPrivateKey({
    key: privateKey,
    format: 'pem',
  });

  const jwt = await new SignJWT({
    iat: Math.floor(now / 1000) - 60, // Issued at time (60 seconds in the past to account for clock drift)
    exp: Math.floor(now / 1000) + 600, // Expiration time (10 minutes)
    iss: appId, // GitHub App's identifier
  })
    .setProtectedHeader({alg: 'RS256'})
    .sign(key);

  // Request a new installation access token
  const {token, expiresAt} = await requestInstallationToken(jwt, installationId);

  // Update the cache
  tokenCache = {token, expiresAt};

  return token;
}

// export async function createGithubAppToken(credentials: AppCredentials): Promise<string> {
//   const { appId, installationId, privateKey } = credentials;

//   // Check if a valid token is already cached
//   const now = Date.now();
//   if (tokenCache && tokenCache.expiresAt > now + 60 * 1000) { // Add 1 minute buffer
//     return tokenCache.token;
//   }

//   // Initialize Octokit with App authentication
//   const auth = createAppAuth({
//     appId: Number(appId), // Ensure appId is a number
//     privateKey,
//     installationId: Number(installationId), // Ensure installationId is a number
//   });

//   // Authenticate as the installation and get the token
//   const authentication = await auth({ type: 'installation' });

//   if (!authentication.token || !authentication.expiresAt) {
//     throw new InputError('Failed to generate GitHub App installation token.');
//   }

//   // Update the cache with the new token and its expiration time
//   tokenCache = {
//     token: authentication.token,
//     expiresAt: new Date(authentication.expiresAt).getTime(),
//   };

//   return tokenCache.token;
// }

export type Credentials = {
  token?: string;
  app?: AppCredentials;
};

export async function createGithubToken(credentials: Credentials): Promise<string> {
  let token: string;

  if (credentials.token) {
    token = credentials.token; // Use the provided token
  } else if (credentials.app) {
    // Placeholder for token generation logic
    token = await createGithubAppToken(credentials.app);
  } else {
    throw new InputError('Invalid credentials: No token or app credentials provided.');
  }

  return token;
}

export async function createGithubClient(credentials: Credentials): Promise<AxiosInstance> {
  const token = await createGithubToken(credentials);
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}
