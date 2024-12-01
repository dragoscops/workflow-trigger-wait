"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGithubClient = exports.createGithubToken = exports.createGithubAppToken = exports.createGithubAppTokenOctokit = exports.createGithubAppTokenRaw = exports.CreateGithubAppTokenError = exports.requestInstallationToken = exports.FailedToRequestInstallationTokenError = exports.tokenCache = void 0;
const auth_app_1 = require("@octokit/auth-app");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const jose_1 = require("jose");
const utils_1 = require("./utils");
const cache_manager_1 = require("cache-manager");
const keyv_1 = __importDefault(require("keyv"));
const github_api_url_1 = require("./github-api-url");
exports.tokenCache = (0, cache_manager_1.createCache)({
    stores: [new keyv_1.default()],
});
class FailedToRequestInstallationTokenError extends utils_1.GenericError {
    runConclusion = 'failed_to_request_app_token';
    static wrapErrorMessage(error) {
        return `Failed to request installation token: ${(0, utils_1.errorMessage)(error)}`;
    }
}
exports.FailedToRequestInstallationTokenError = FailedToRequestInstallationTokenError;
async function requestInstallationToken(jwtToken, credentials) {
    const endpoint = github_api_url_1.GithubApiUrl.getInstance().appGenerateInstallationAccessToken({
        credentials: { app: credentials },
    });
    const url = `https://api.github.com${endpoint}`;
    const config = {
        headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: 'application/vnd.github+json',
        },
    };
    try {
        const response = await axios_1.default.post(url, {}, config);
        if (response.status !== 201) {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
        const { token, expires_at } = response.data;
        if (!token || !expires_at) {
            throw new Error('Token or expiration time not found in the response.');
        }
        return {
            token,
            expiresAt: new Date(expires_at).getTime(),
        };
    }
    catch (error) {
        throw new FailedToRequestInstallationTokenError(FailedToRequestInstallationTokenError.wrapErrorMessage(error), {
            cause: error,
        });
    }
}
exports.requestInstallationToken = requestInstallationToken;
class CreateGithubAppTokenError extends utils_1.GenericError {
    runConclusion = 'failed_to_create_github_app_token';
    static wrapErrorMessage(error) {
        return `Failed to generate Github App Token: ${(0, utils_1.errorMessage)(error)}`;
    }
}
exports.CreateGithubAppTokenError = CreateGithubAppTokenError;
async function createGithubAppTokenRaw(credentials) {
    const { appId, installationId, privateKey } = credentials;
    if (!appId || !installationId || !privateKey) {
        throw new utils_1.InputError(utils_1.errorMessage_MissingAppCredentialsKeys);
    }
    const tokenValue = await exports.tokenCache.get('token');
    if (tokenValue) {
        return tokenValue;
    }
    const key = (0, crypto_1.createPrivateKey)({
        key: privateKey,
        format: 'pem',
    });
    try {
        const now = Date.now();
        const jwt = await new jose_1.SignJWT({
            iat: Math.floor(now / 1000) - 60,
            exp: Math.floor(now / 1000) + 600,
            iss: appId,
        })
            .setProtectedHeader({ alg: 'RS256' })
            .sign(key);
        const { token, expiresAt } = await requestInstallationToken(jwt, credentials);
        exports.tokenCache.set('token', token, expiresAt - 60 * 1000);
        return token;
    }
    catch (error) {
        throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage(error), { cause: error });
    }
}
exports.createGithubAppTokenRaw = createGithubAppTokenRaw;
async function createGithubAppTokenOctokit(credentials) {
    const { appId, installationId, privateKey } = credentials;
    if (!appId || !installationId || !privateKey) {
        throw new utils_1.InputError(utils_1.errorMessage_MissingAppCredentialsKeys);
    }
    const token = await exports.tokenCache.get('token');
    if (token) {
        return token;
    }
    const auth = (0, auth_app_1.createAppAuth)({
        appId: Number(appId),
        privateKey,
        installationId: Number(installationId),
    });
    const authentication = await auth({ type: 'installation' });
    if (!authentication.token || !authentication.expiresAt) {
        throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
    }
    exports.tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);
    return authentication.token;
}
exports.createGithubAppTokenOctokit = createGithubAppTokenOctokit;
async function createGithubAppToken(credentials) {
    return createGithubAppTokenRaw(credentials);
}
exports.createGithubAppToken = createGithubAppToken;
async function createGithubToken(credentials) {
    let token;
    if (credentials.token) {
        token = credentials.token;
    }
    else if (credentials.app) {
        token = await createGithubAppToken(credentials.app);
    }
    else {
        throw new utils_1.InputError('Invalid credentials: No token or app credentials provided.');
    }
    return token;
}
exports.createGithubToken = createGithubToken;
async function createGithubClient(credentials) {
    const token = await createGithubToken(credentials);
    return axios_1.default.create({
        baseURL: 'https://api.github.com',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });
}
exports.createGithubClient = createGithubClient;
