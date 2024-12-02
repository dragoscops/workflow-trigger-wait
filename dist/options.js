"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOptions = exports.defaultOptionsForApp = exports.defaultOptions = exports.actionTypes = exports.actionWaitOnly = exports.actionTriggerOnly = exports.actionTriggerAndWait = void 0;
const core = __importStar(require("@actions/core"));
const parse_duration_1 = __importDefault(require("parse-duration"));
const utils_1 = require("./utils");
exports.actionTriggerAndWait = 'trigger-and-wait';
exports.actionTriggerOnly = 'trigger-only';
exports.actionWaitOnly = 'wait-only';
exports.actionTypes = [exports.actionTriggerAndWait, exports.actionTriggerOnly, exports.actionWaitOnly];
exports.defaultOptions = {
    credentials: { token: 'fake-token' },
    repo: 'owner/repo',
    workflowId: 'deploy.yml',
    ref: 'main',
    inputs: { key: 'value' },
    waitInterval: 500,
    timeout: 2000,
    action: exports.actionTriggerAndWait,
    noThrow: 'false',
    runId: '',
    determineRunId: {
        pollingInterval: 500,
        maxPollingAttempts: 3,
    },
};
exports.defaultOptionsForApp = {
    ...exports.defaultOptions,
    credentials: {
        app: {
            appId: '123456',
            installationId: '78910',
            privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...IDAQAB\n-----END PRIVATE KEY-----',
        },
    },
};
function processOptions() {
    let credentials;
    const credentialsInput = core.getInput('credentials');
    try {
        credentials = JSON.parse(credentialsInput);
    }
    catch (error) {
        throw new utils_1.InputError(`Invalid JSON for credentials: ${(0, utils_1.errorMessage)(error)}`);
    }
    if (!credentials.token && !credentials.app) {
        throw new utils_1.InputError(`You must provide either a 'token' or 'app' in credentials.`);
    }
    if (credentials.app) {
        if (!credentials.app?.appId || !credentials.app?.installationId || !credentials.app?.privateKey) {
            throw new utils_1.InputError('Invalid Github App credentials');
        }
        credentials.app.privateKey = Buffer.from(credentials.app?.privateKey, 'base64').toString('utf-8');
    }
    const options = {
        credentials,
        repo: core.getInput('repo'),
        workflowId: core.getInput('workflow_id'),
        ref: core.getInput('ref') || 'main',
        inputs: JSON.parse(core.getInput('inputs') || '{}'),
        waitInterval: (0, parse_duration_1.default)(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000,
        timeout: (0, parse_duration_1.default)(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000,
        action: core.getInput('action'),
        noThrow: core.getInput('no_throw') || 'false',
        runId: core.getInput('run_id'),
        debug: core.getInput('debug') || 'no',
    };
    const { action } = options;
    if (!exports.actionTypes.includes(action)) {
        throw new utils_1.InputError(`Invalid action: ${action}`);
    }
    return options;
}
exports.processOptions = processOptions;
