import * as core from '@actions/core';
import {createAppAuth, InstallationAccessTokenAuthentication} from '@octokit/auth-app';
import {request} from '@octokit/request';
import axios, {AxiosInstance} from 'axios';
import {createCache} from 'cache-manager';
import Keyv from 'keyv';
import {errorMessage, GenericError, InputError} from './utils.js';
import {doDebug, Options} from './options.js';
import type * as OctokitTypes from '@octokit/types';
import pRetry from 'p-retry';

export const tokenCache = createCache({
  stores: [new Keyv()],
});

export async function createGithubClient(options: Options): Promise<AxiosInstance> {
  const token = await createGithubToken(options);
  doDebug(options, '[createGithubClient]', Buffer.from(token, 'utf-8').toString('base64'));
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
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
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY || privateKey.replace(/\\n*/g, '\n'),
    request,
  });
  const auth = createAppAuth({
    appId: Number(appId), // Ensure appId is a number
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY || privateKey.replace(/\\n*/g, '\n'),
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

export class CreateGithubAppTokenError extends GenericError {
  runConclusion = 'failed_to_create_app_token';

  static wrapErrorMessage(error: unknown) {
    return `Failed to create app token: ${errorMessage(error)}`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function authenticateGithubApp(
  auth: ReturnType<typeof createAppAuth>,
  request: OctokitTypes.RequestInterface,
  options: Options,
): Promise<InstallationAccessTokenAuthentication> {
  const {installationId} = options.credentials.app!;
  if (installationId && installationId.length > 0) {
    return auth({type: 'installation', installationId});
  }

  core.info('no installation id presented, moving on to detecting one');

  return authenticateGithubAppByOwnerAndRepository(auth, request, options);
}

export async function authenticateGithubAppByOwnerAndRepository(
  auth: ReturnType<typeof createAppAuth>,
  request: OctokitTypes.RequestInterface,
  options: Options,
): Promise<InstallationAccessTokenAuthentication> {
  let {owner, repositories = []} = options.credentials.app!;
  let repo;

  // if no owner is set, default it from current repository
  if (!owner) {
    [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    core.info(`owner not set, creating token for the current repository ("${repo}")`);
    // if no owner and not repositories are set, default it from current repository
    if (repositories.length === 0) {
      repositories = [repo];
      core.info(`repositories not set, creating token for the current repository ("${repo}")`);
    } else {
      core.info(
        `owner not set, creating owner for given repositories "${repositories.join(
          ',',
        )}" in current owner ("${owner}")`,
      );
    }
  } else {
    if (repositories.length === 0) {
      core.info(`repositories not set, creating token for all repositories for given owner "${owner}"`);
    } else {
      core.info(
        `owner and repositories set, creating token for repositories "${repositories.join(',')}" owned by "${owner}"`,
      );
    }
  }

  doDebug(options, '[authenticateGithubAppByOwnerAndRepository]', {
    owner,
    repositories,
  });

  if (!repositories || repositories?.length === 0) {
    return pRetry(() => authenticateGithubAppByOwner(auth, request, owner, options), {
      retries: 3,
      onFailedAttempt: (err) => {
        core.warning(`Failed to authenticate GitHub App, attempt ${err.attemptNumber} of 3: ${errorMessage(err)}`);
      },
    });
  }

  return pRetry(() => authenticateGithubAppByRepository(auth, request, owner, repositories[0], options), {
    retries: 3,
    onFailedAttempt: (err) => {
      core.warning(`Failed to authenticate GitHub App, attempt ${err.attemptNumber} of 3: ${errorMessage(err)}`);
    },
  });
}

export async function authenticateGithubAppByOwner(
  auth: ReturnType<typeof createAppAuth>,
  request: OctokitTypes.RequestInterface,
  owner: string,
  options: Options,
): Promise<InstallationAccessTokenAuthentication> {
  const response = await request('GET /users/{owner}/installation', {owner, request: {hook: auth.hook}});

  doDebug(options, '[authenticateGithubAppByOwner]', response);

  return auth({
    type: 'installation',
    installationId: response.data.id,
  });
}

export async function authenticateGithubAppByRepository(
  auth: ReturnType<typeof createAppAuth>,
  request: OctokitTypes.RequestInterface,
  owner: string,
  repo: string,
  options: Options,
): Promise<InstallationAccessTokenAuthentication> {
  const response = await request('GET /users/{owner}/{repo}/installation', {
    owner,
    repo,
    request: {hook: auth.hook},
  });

  doDebug(options, '[authenticateGithubAppByRepository]', response);

  return auth({
    type: 'installation',
    installationId: response.data.id,
  });
}
