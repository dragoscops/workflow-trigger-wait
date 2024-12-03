import {createAppAuth} from '@octokit/auth-app';
import {request} from '@octokit/request';
import axios, {AxiosInstance} from 'axios';
import {createCache} from 'cache-manager';
import Keyv from 'keyv';
import {doDebug, errorMessage, GenericError, InputError} from './utils.js';
import {Options} from './options.js';

export const tokenCache = createCache({
  stores: [new Keyv()],
});

export class CreateGithubAppTokenError extends GenericError {
  runConclusion = 'failed_to_create_app_token';

  static wrapErrorMessage(error: unknown) {
    return `Failed to create app token: ${errorMessage(error)}`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function authenticateGithubApp(auth: any, request: any, options: Options): Promise<any> {
  const {installationId} = options.credentials.app!;
  if (installationId && installationId.length > 0) {
    return auth({type: 'installation', installationId});
  }

  let {owner, repositories} = options.credentials.app!;
  // let repo;
  // if (!owner) {
  //   [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  //   if (!repositories) {
  //     repositories = [repo];
  //   }
  // }

  let response;
  if (!repositories || repositories?.length === 0) {
    response = await request('GET /users/{owner}/installation', {owner, request: {hook: auth.hook}});
  } else {
    response = await request('GET /users/{owner}/{repo}/installation', {
      owner,
      repo: repositories[0],
      request: {hook: auth.hook},
    });
  }

  console.log(response.data);

  return {};
}

/**
 * Create a GitHub App installation token using Octokit.
 */
export async function createGithubAppToken(options: Options): Promise<string> {
  const {appId, privateKey} = options.credentials.app!;

  // Check if a valid token is already cached
  const token = await tokenCache.get<string>('token');
  if (token) {
    return token;
  }

  // Initialize Octokit with App authentication
  doDebug(options, '[createAppAuth]', {
    appId: Number(appId), // Ensure appId is a number
    privateKey: privateKey.replace(/\\n/g, '\n'),
    request,
  });
  const auth = createAppAuth({
    appId: Number(appId), // Ensure appId is a number
    privateKey: privateKey.replace(/\\n/g, '\n'),
    request,
  });

  // Authenticate as the installation and get the token
  const authentication = await authenticateGithubApp(auth, request, options);
  if (!authentication.token || !authentication.expiresAt) {
    throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
  }
  // set a 1 minute less expiration time for the cache
  tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);

  return authentication.token;
}

export async function createGithubToken(options: Options): Promise<string> {
  const {credentials} = options;
  let token: string;
  if (credentials.token) {
    doDebug({credentials} as Options, '[createGithubToken(token)]');
    token = credentials.token; // Use the provided token
  } else if (credentials.app) {
    doDebug({credentials} as Options, '[createGithubToken(app)]');
    token = await createGithubAppToken(options); // Placeholder for token generation logic
  } else {
    throw new InputError('Invalid credentials: No token or app credentials provided.');
  }
  doDebug({credentials} as Options, '[createGithubToken]', token);
  return token;
}

export async function createGithubClient(options: Options): Promise<AxiosInstance> {
  const token = await createGithubToken(options);
  doDebug(options, '[createGithubClient]', token);
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}
