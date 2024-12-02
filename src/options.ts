import * as core from '@actions/core';
import parseDuration from 'parse-duration';

import {errorMessage, InputError} from './utils';

export const actionTriggerAndWait = 'trigger-and-wait';
export const actionTriggerOnly = 'trigger-only';
export const actionWaitOnly = 'wait-only';

export const actionTypes = [actionTriggerAndWait, actionTriggerOnly, actionWaitOnly] as const;

export type ActionType = (typeof actionTypes)[number];

export type AppCredentials = {
  appId: string;
  installationId: string;
  privateKey: string;
};

export type Credentials = {
  token?: string;
  app?: AppCredentials;
};

export type Options = {
  credentials: Credentials;
  repo: string;
  workflowId: string;
  ref: string;
  inputs: Record<string, string>;
  waitInterval: number;
  timeout: number;
  action: ActionType;
  noThrow: string;
  runId: string;
  determineRunId?: {
    pollingInterval?: number;
    maxPollingAttempts?: number;
  };
  debug?: string;
};

export const defaultOptions: Options = {
  credentials: {token: 'fake-token'},
  repo: 'owner/repo',
  workflowId: 'deploy.yml',
  ref: 'main',
  inputs: {key: 'value'},
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

export const defaultOptionsForApp: Options = {
  ...defaultOptions,
  credentials: {
    app: {
      appId: '123456',
      installationId: '78910',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...IDAQAB\n-----END PRIVATE KEY-----',
    },
  },
};

export function processOptions() {
  let credentials: Credentials;
  const credentialsInput = core.getInput('credentials');

  try {
    credentials = JSON.parse(credentialsInput);
  } catch (error) {
    throw new InputError(`Invalid JSON for credentials: ${errorMessage(error)}`);
  }

  if (!credentials.token && !credentials.app) {
    throw new InputError(`You must provide either a 'token' or 'app' in credentials.`);
  }

  if (credentials.app) {
    if (!credentials.app?.appId || !credentials.app?.installationId || !credentials.app?.privateKey) {
      throw new InputError('Invalid Github App credentials');
    }
    credentials.app.privateKey = Buffer.from(credentials.app?.privateKey, 'base64').toString('utf-8');
  }

  const options = {
    credentials,
    repo: core.getInput('repo'),
    workflowId: core.getInput('workflow_id'),
    ref: core.getInput('ref') || 'main',
    inputs: JSON.parse(core.getInput('inputs') || '{}'),
    waitInterval: parseDuration(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000,
    timeout: parseDuration(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000,
    action: core.getInput('action') as ActionType,
    noThrow: core.getInput('no_throw') || 'false',
    runId: core.getInput('run_id'),
    debug: core.getInput('debug') || 'no',
  };

  const {action} = options;

  if (!actionTypes.includes(action)) {
    throw new InputError(`Invalid action: ${action}`);
  }

  return options;
}
