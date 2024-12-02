import {createAppAuth} from '@octokit/auth-app';
import axios, {AxiosInstance} from 'axios';
import {doDebug, errorMessage, GenericError, InputError} from './utils';
import {createCache} from 'cache-manager';
import Keyv from 'keyv';
import {AppCredentials, Credentials, Options} from './options';

export const tokenCache = createCache({
  stores: [new Keyv()],
});

export class CreateGithubAppTokenError extends GenericError {
  runConclusion = 'failed_to_create_app_token';

  static wrapErrorMessage(error: unknown) {
    return `Failed to create app token: ${errorMessage(error)}`;
  }
}

/**
 * Create a GitHub App installation token using Octokit.
 */
export async function createGithubAppToken(credentials: AppCredentials): Promise<string> {
  const {appId, privateKey} = credentials;

  // Check if a valid token is already cached
  const token = await tokenCache.get<string>('token');
  if (token) {
    return token;
  }

  // Initialize Octokit with App authentication
  const auth = createAppAuth({
    appId: Number(appId), // Ensure appId is a number
    privateKey,
    // TODO: not sure I need the request...
    // https://github.com/actions/create-github-app-token/blob/main/lib/request.js
    // request
  });

  // Authenticate as the installation and get the token
  const authentication = await auth({type: 'installation'});
  if (!authentication.token || !authentication.expiresAt) {
    throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
  }
  // set a 1 minute less expiration time for the cache
  tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);

  return authentication.token;
}

export async function createGithubToken(credentials: Credentials): Promise<string> {
  let token: string;
  if (credentials.token) {
    doDebug({credentials} as Options, '[createGithubToken(token)]');
    token = credentials.token; // Use the provided token
  } else if (credentials.app) {
    doDebug({credentials} as Options, '[createGithubToken(app)]');
    token = await createGithubAppToken(credentials.app); // Placeholder for token generation logic
  } else {
    throw new InputError('Invalid credentials: No token or app credentials provided.');
  }
  doDebug({credentials} as Options, '[createGithubToken]', token);
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
