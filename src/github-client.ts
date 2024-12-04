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

export class GithubClient {
  private tokenCache = createCache({
    stores: [new Keyv()],
  });

  private constructor(private options: Options) {}

  static instance(options: Options): GithubClient {
    return new GithubClient(options);
  }

  async create(): Promise<AxiosInstance> {
    const token = await this.createToken();
    doDebug(this.options, '[createGithubClient]', Buffer.from(token, 'utf-8').toString('base64'));
    return axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  async createToken(): Promise<string> {
    const {credentials} = this.options;
    let token: string;
    if (credentials.token) {
      doDebug(this.options, '[createGithubToken(token)]');
      token = credentials.token; // Use the provided token
    } else if (credentials.app) {
      doDebug(this.options, '[createGithubToken(app)]');
      token = await this.createAppToken(); // Placeholder for token generation logic
    } else {
      throw new InputError('Invalid credentials: No token or app credentials provided.');
    }
    doDebug(this.options, '[createGithubToken]', token);
    return token;
  }

  /**
   * Create a GitHub App installation token using Octokit.
   */
  async createAppToken(): Promise<string> {
    const {appId, privateKey} = this.options.credentials.app!;

    // Check if a valid token is already cached
    const token = await this.tokenCache.get<string>('token');
    if (token) {
      return token;
    }

    // Initialize Octokit with App authentication
    doDebug(this.options, '[createAppAuth]', {
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
    const authentication = await this.authenticateApp(auth, request);
    if (!authentication.token || !authentication.expiresAt) {
      throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
    }
    // set expiration to 90% of the token expiration date
    const tokenExpireTtl = new Date(authentication.expiresAt).getTime() - new Date().getTime();
    this.tokenCache.set('token', authentication.token, Math.trunc(tokenExpireTtl * 0.9));

    return authentication.token;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async authenticateApp(
    auth: ReturnType<typeof createAppAuth>,
    request: OctokitTypes.RequestInterface,
  ): Promise<InstallationAccessTokenAuthentication> {
    const {installationId} = this.options.credentials.app!;
    if (installationId && installationId.length > 0) {
      return auth({type: 'installation', installationId});
    }

    core.info('no installation id presented, moving on to detecting one');

    return this.authenticateAppByOwnerAndRepository(auth, request);
  }

  async authenticateAppByOwnerAndRepository(
    auth: ReturnType<typeof createAppAuth>,
    request: OctokitTypes.RequestInterface,
  ): Promise<InstallationAccessTokenAuthentication> {
    let {owner, repositories = []} = this.options.credentials.app!;
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

    doDebug(this.options, '[authenticateGithubAppByOwnerAndRepository]', {
      owner,
      repositories,
    });

    if (!repositories || repositories?.length === 0) {
      return pRetry(() => this.authenticateAppByOwner(auth, request, owner), {
        retries: 3,
        onFailedAttempt: (err) => {
          core.warning(`Failed to authenticate GitHub App, attempt ${err.attemptNumber} of 3: ${errorMessage(err)}`);
        },
      });
    }

    return pRetry(() => this.authenticateAppByRepository(auth, request, owner, repositories[0]), {
      retries: 3,
      onFailedAttempt: (err) => {
        core.warning(`Failed to authenticate GitHub App, attempt ${err.attemptNumber} of 3: ${errorMessage(err)}`);
      },
    });
  }

  async authenticateAppByOwner(
    auth: ReturnType<typeof createAppAuth>,
    request: OctokitTypes.RequestInterface,
    owner: string,
  ): Promise<InstallationAccessTokenAuthentication> {
    const response = await request('GET /users/{owner}/installation', {owner, request: {hook: auth.hook}});

    doDebug(this.options, '[authenticateGithubAppByOwner]', response);

    return auth({
      type: 'installation',
      installationId: response.data.id,
    });
  }

  async authenticateAppByRepository(
    auth: ReturnType<typeof createAppAuth>,
    request: OctokitTypes.RequestInterface,
    owner: string,
    repo: string,
  ): Promise<InstallationAccessTokenAuthentication> {
    const response = await request('GET /repos/{owner}/{repo}/installation', {
      owner,
      repo,
      request: {hook: auth.hook},
    });

    doDebug(this.options, '[authenticateGithubAppByRepository]', response);

    return auth({
      type: 'installation',
      installationId: response.data.id,
    });
  }
}

export class CreateGithubAppTokenError extends GenericError {
  runConclusion = 'failed_to_create_app_token';

  static wrapErrorMessage(error: unknown) {
    return `Failed to create app token: ${errorMessage(error)}`;
  }
}
