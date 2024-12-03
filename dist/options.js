import * as core from '@actions/core';
import parseDuration from 'parse-duration';
import { errorMessage, InputError } from './utils.js';
export const actionTriggerAndWait = 'trigger-and-wait';
export const actionTriggerOnly = 'trigger-only';
export const actionWaitOnly = 'wait-only';
export const actionTypes = [actionTriggerAndWait, actionTriggerOnly, actionWaitOnly];
export const defaultOptions = {
    credentials: { token: 'fake-token' },
    repo: 'owner/repo',
    workflowId: 'deploy.yml',
    ref: 'main',
    inputs: { key: 'value' },
    waitInterval: 500,
    timeout: 2000,
    action: actionTriggerAndWait,
    noThrow: 'false',
    runId: '',
    determineRunId: {
        pollingInterval: 500,
        maxPollingAttempts: 3,
    },
};
export const defaultOptionsForApp = {
    ...defaultOptions,
    credentials: {
        app: {
            appId: '123456',
            privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...IDAQAB\n-----END PRIVATE KEY-----',
        },
    },
};
export function doDebug(options, ...values) {
    if (['true', 'yes'].includes((options.debug ?? 'no').toLowerCase())) {
        if (typeof values[0] === 'string') {
            console.log(`::group::${values[0]}`);
        }
        console.log(...values);
        if (typeof values[0] === 'string') {
            console.log('::endgroup::');
        }
    }
}
export function processOptions() {
    let credentials;
    const credentialsInput = core.getInput('credentials');
    try {
        credentials = JSON.parse(credentialsInput);
    }
    catch (error) {
        throw new InputError(`Invalid JSON for credentials: ${errorMessage(error)}`);
    }
    if (!credentials.token && !credentials.app) {
        throw new InputError(`You must provide either a 'token' or 'app' in credentials.`);
    }
    if (credentials.app && (!credentials.app?.appId || !credentials.app?.privateKey)) {
        throw new InputError('Invalid Github App credentials');
    }
    const options = {
        credentials,
        repo: core.getInput('repo'),
        workflowId: core.getInput('workflow_id'),
        ref: core.getInput('ref') || 'main',
        inputs: JSON.parse(core.getInput('inputs') || '{}'),
        waitInterval: parseDuration(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000,
        timeout: parseDuration(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000,
        action: core.getInput('action'),
        noThrow: core.getInput('no_throw') || 'false',
        runId: core.getInput('run_id'),
        debug: core.getInput('debug') || 'no',
    };
    const { action } = options;
    if (!actionTypes.includes(action)) {
        throw new InputError(`Invalid action: ${action}`);
    }
    return options;
}
