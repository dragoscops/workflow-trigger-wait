import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { request } from '@octokit/request';
import axios from 'axios';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';
import { errorMessage, GenericError, InputError } from './utils.js';
import { doDebug } from './options.js';
import pRetry from 'p-retry';
export const tokenCache = createCache({
    stores: [new Keyv()],
});
export async function createGithubClient(options) {
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
export async function createGithubToken(options) {
    const { credentials } = options;
    let token;
    if (credentials.token) {
        doDebug({ credentials }, '[createGithubToken(token)]');
        token = credentials.token;
    }
    else if (credentials.app) {
        doDebug({ credentials }, '[createGithubToken(app)]');
        token = await createGithubAppToken(options);
    }
    else {
        throw new InputError('Invalid credentials: No token or app credentials provided.');
    }
    doDebug({ credentials }, '[createGithubToken]', token);
    return token;
}
export async function createGithubAppToken(options) {
    const { appId, privateKey } = options.credentials.app;
    const token = await tokenCache.get('token');
    if (token) {
        return token;
    }
    doDebug(options, '[createAppAuth]', {
        appId: Number(appId),
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY || privateKey.replace(/\\n*/g, '\n'),
        request,
    });
    const auth = createAppAuth({
        appId: Number(appId),
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY || privateKey.replace(/\\n*/g, '\n'),
        request,
    });
    const authentication = await authenticateGithubApp(auth, request, options);
    if (!authentication.token || !authentication.expiresAt) {
        throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
    }
    tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);
    return authentication.token;
}
export class CreateGithubAppTokenError extends GenericError {
    runConclusion = 'failed_to_create_app_token';
    static wrapErrorMessage(error) {
        return `Failed to create app token: ${errorMessage(error)}`;
    }
}
export async function authenticateGithubApp(auth, request, options) {
    const { installationId } = options.credentials.app;
    if (installationId && installationId.length > 0) {
        return auth({ type: 'installation', installationId });
    }
    core.info('no installation id presented, moving on to detecting one');
    return authenticateGithubAppByOwnerAndRepository(auth, request, options);
}
export async function authenticateGithubAppByOwnerAndRepository(auth, request, options) {
    let { owner, repositories = [] } = options.credentials.app;
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
export async function authenticateGithubAppByOwner(auth, request, owner, options) {
    const response = await request('GET /users/{owner}/installation', { owner, request: { hook: auth.hook } });
    doDebug(options, '[authenticateGithubAppByOwner]', response);
    return auth({
        type: 'installation',
        installationId: response.data.id,
    });
}
export async function authenticateGithubAppByRepository(auth, request, owner, repo, options) {
    const response = await request('GET /users/{owner}/{repo}/installation', {
        owner,
        repo,
        request: { hook: auth.hook },
    });
    doDebug(options, '[authenticateGithubAppByRepository]', response);
    return auth({
        type: 'installation',
        installationId: response.data.id,
    });
}
