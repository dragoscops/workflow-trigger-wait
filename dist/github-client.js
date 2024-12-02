"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGithubClient = exports.createGithubToken = exports.createGithubAppToken = exports.CreateGithubAppTokenError = exports.tokenCache = void 0;
const auth_app_1 = require("@octokit/auth-app");
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("./utils");
const cache_manager_1 = require("cache-manager");
const keyv_1 = __importDefault(require("keyv"));
exports.tokenCache = (0, cache_manager_1.createCache)({
    stores: [new keyv_1.default()],
});
class CreateGithubAppTokenError extends utils_1.GenericError {
    runConclusion = 'failed_to_create_app_token';
    static wrapErrorMessage(error) {
        return `Failed to create app token: ${(0, utils_1.errorMessage)(error)}`;
    }
}
exports.CreateGithubAppTokenError = CreateGithubAppTokenError;
async function createGithubAppToken(credentials) {
    const { appId, privateKey } = credentials;
    const token = await exports.tokenCache.get('token');
    if (token) {
        return token;
    }
    const auth = (0, auth_app_1.createAppAuth)({
        appId: Number(appId),
        privateKey,
    });
    const authentication = await auth({ type: 'installation' });
    if (!authentication.token || !authentication.expiresAt) {
        throw new CreateGithubAppTokenError(CreateGithubAppTokenError.wrapErrorMessage('Octokit Auth Failed'));
    }
    exports.tokenCache.set('token', authentication.token, new Date(authentication.expiresAt).getTime() - 60 * 1000);
    return authentication.token;
}
exports.createGithubAppToken = createGithubAppToken;
async function createGithubToken(credentials) {
    let token;
    if (credentials.token) {
        (0, utils_1.doDebug)({ credentials }, '[createGithubToken(token)]');
        token = credentials.token;
    }
    else if (credentials.app) {
        (0, utils_1.doDebug)({ credentials }, '[createGithubToken(app)]');
        token = await createGithubAppToken(credentials.app);
    }
    else {
        throw new utils_1.InputError('Invalid credentials: No token or app credentials provided.');
    }
    (0, utils_1.doDebug)({ credentials }, '[createGithubToken]', token);
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
