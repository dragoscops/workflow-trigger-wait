import { createAppAuth } from '@octokit/auth-app';
import axios from 'axios';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';
import { doDebug, errorMessage, GenericError, InputError } from './utils.js';
export const tokenCache = createCache({
    stores: [new Keyv()],
});
export class CreateGithubAppTokenError extends GenericError {
    runConclusion = 'failed_to_create_app_token';
    static wrapErrorMessage(error) {
        return `Failed to create app token: ${errorMessage(error)}`;
    }
}
export async function createGithubAppToken(credentials) {
    const { appId, privateKey } = credentials;
    const token = await tokenCache.get('token');
    if (token) {
        return token;
    }
    const auth = createAppAuth({
        appId: Number(appId),
        privateKey,
    });
    const authentication = await auth({ type: 'installation' });
    if (!authentication.token || !authentication.expiresAt) {
        throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
    }
    tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);
    return authentication.token;
}
export async function createGithubToken(credentials) {
    let token;
    if (credentials.token) {
        doDebug({ credentials }, '[createGithubToken(token)]');
        token = credentials.token;
    }
    else if (credentials.app) {
        doDebug({ credentials }, '[createGithubToken(app)]');
        token = await createGithubAppToken(credentials.app);
    }
    else {
        throw new InputError('Invalid credentials: No token or app credentials provided.');
    }
    doDebug({ credentials }, '[createGithubToken]', token);
    return token;
}
export async function createGithubClient(credentials) {
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