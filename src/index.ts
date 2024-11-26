/* eslint-disable max-lines-per-function */
import * as core from '@actions/core';
import axios, {AxiosRequestConfig} from 'axios';
import parseDuration from 'parse-duration';

export const actionTypes = ['trigger-and-wait', 'trigger-only', 'wait-only'] as const;

export type ActionType = (typeof actionTypes)[number];

export type Options = {
  githubToken: string;
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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

export function silentFail(noThrow: string): boolean {
  return ['true', 'yes'].includes(noThrow.toLowerCase());
}

export function doDebug(options: Options, ...values: unknown[]) {
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

export async function sleep(interval = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, interval));
}

export default async function run(): Promise<void> {
  const options: Options = {
    githubToken: core.getInput('github_token'),
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

  try {
    await runAction(options);
    core.setOutput('run_conclusion', 'success'); // Explicitly mark as successful
  } catch (error) {
    const conclusion = error instanceof GenericError ? error.runConclusion ?? 'unknown' : 'unknown';

    core.setOutput('run_conclusion', conclusion); // Always set the conclusion
    console.error(`Error: ${errorMessage(error)}`);
    console.error(`Run Conclusion: ${conclusion}`);
    doDebug(options, '[runAction]', error);
    if (silentFail(options.noThrow)) {
      console.warn('Silent fail enabled. Suppressing action failure.');
    } else {
      core.setFailed(`Action failed with error: ${errorMessage(error)}`);
    }
  }
}

export class GenericError extends Error {
  runConclusion = 'unknown';
}

export class InputError extends GenericError {}

export async function runAction(options: Options) {
  const {action} = options;

  if (!actionTypes.includes(action)) {
    throw new InputError(`Invalid action: ${action}`);
  }

  if (action.includes('trigger')) {
    options.runId = await triggerWorkflow(options);
  }

  if (action.includes('wait')) {
    if (!options.runId) {
      throw new InputError(`run_id is required for action: wait-only`);
    }
    await waitForWorkflow(options);
  }
}

export class InvalidWorkflowError extends Error {
  runConclusion = 'invalid_workflow';
}

export class TriggerWorkflowError extends Error {
  runConclusion = 'trigger_failed';
}

export async function triggerWorkflow(options: Options): Promise<string> {
  const {repo, workflowId} = options;

  if (!workflowId || !repo) {
    throw new InvalidWorkflowError(`Invalid workflowId or repo: ${workflowId} / ${repo}`);
  }

  try {
    await createWorkflow(options);
  } catch (error) {
    doDebug(options, '[triggerWorkflow > createWorkflow]', error);
    throw new TriggerWorkflowError(`Failed to trigger workflow: ${errorMessage(error)}`, {cause: error});
  }

  // Since GitHub's API for dispatching a workflow does not return run_id, this part will need to be adjusted.
  // Here, we're assuming a way to obtain the run_id after triggering, which needs actual implementation.
  try {
    return determineWorkflowRunId(options);
  } catch (error) {
    doDebug(options, '[triggerWorkflow > determineWorkflowRunId]', error);
    throw new TriggerWorkflowError(`Failed to read workflow id: ${errorMessage(error)}`, {cause: error});
  }
}

export function getWorkflowDispatchUrl({repo, workflowId}: Options) {
  const [owner, repoName] = repo.split('/');
  return `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
}

export class CreateWorkflowError extends Error {
  runConclusion = 'workflow_failed';
}

export async function createWorkflow(options: Options): Promise<void> {
  const {ref, inputs, githubToken} = options;
  const workflowUrl = getWorkflowDispatchUrl(options);

  core.info(`Calling ${workflowUrl}@${ref}`);
  try {
    const response = await axios.post(
      workflowUrl,
      {
        ref,
        inputs,
      },
      buildAxiosOptions(githubToken),
    );
    doDebug(options, '[createWorkflow > axios.post]', workflowUrl, response);
    if (response.status !== 204) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    doDebug(options, '[createWorkflow > axios.post]', workflowUrl, error);
    throw new Error(`Failed to trigger workflow: ${errorMessage(error)}`);
  }
  core.info(`Called ${workflowUrl}@${ref}`);
}

class DetermineWorkflowIdError extends TriggerWorkflowError {}

export async function determineWorkflowRunId(options: Options): Promise<string> {
  const determineRunId = {
    pollingInterval: 5000, // 5 seconds
    maxPollingAttempts: 12, // 1 minute
    ...(options.determineRunId ?? {}),
  };
  const {maxPollingAttempts, pollingInterval} = determineRunId;
  let runId = '';

  for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
    core.info(`Polling attempt  to get run ID...`);
    try {
      runId = await determineWorkflowRunIdAttempt(options);
    } catch (error) {
      doDebug(options, '[determineWorkflowRunId > determineWorkflowRunIdAttempt]', error);
      throw new DetermineWorkflowIdError(`Failed to get workflow run ID: ${errorMessage(error)}`, {cause: error});
    }

    if (runId) {
      core.info(`Workflow run ID: ${runId}`);
      core.setOutput('run_id', runId);
      core.info(`For more info, visit ${getWorkflowDetailsIdUrl(options)}`);
      return runId;
    }

    await sleep(pollingInterval);
  }

  throw new DetermineWorkflowIdError('Failed to get workflow run ID after multiple polling attempts');
}

export function getWorkflowDetailsIdUrl({repo, runId}: Options) {
  return `https://github.com/${repo}/actions/runs/${runId}`;
}

export async function determineWorkflowRunIdAttempt(options: Options): Promise<string> {
  const {ref, workflowId, githubToken} = options;

  // Implement logic to fetch the most recent workflow run id based on the ref
  // Placeholder implementation, please replace with actual logic
  const runsListUrl = getRunsListUrl(options);
  const response = await axios.get(runsListUrl, buildAxiosOptions(githubToken));
  doDebug(options, '[determineWorkflowRunIdAttempt > axios.get]', getRunsListUrl, response);

  const runs = response?.data?.workflow_runs ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = runs.find((r: any) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed');
  if (!run) {
    return '';
  }

  return run.id.toString();
}

export function getRunsListUrl({repo}: Options) {
  return `https://api.github.com/repos/${repo}/actions/runs`;
}

export function buildAxiosOptions(githubToken: string): AxiosRequestConfig {
  return {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
}

class WaitForWorkflowError extends Error {
  constructor(
    public runConclusion: string,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) {
    super(message, ...args);
  }
}

class WorkflowTimeoutError extends Error {
  runConclusion = 'timeout';
}

// eslint-disable-next-line max-params
export async function waitForWorkflow(options: Options): Promise<void> {
  const {runId, waitInterval, timeout, githubToken} = options;
  if (!runId) {
    throw new InputError(`Invalid runId: ${runId}`);
  }

  core.info(`Waiting for workflow ${runId}`);
  core.info(`For more info, visit ${getWorkflowDetailsIdUrl(options)}`);
  const startTime = Date.now();

  const workflowRunStatusUrl = getWorkflowRunStatusUrl(options);
  let response;
  while (Date.now() - startTime <= timeout) {
    try {
      response = await axios.get(workflowRunStatusUrl, buildAxiosOptions(githubToken));
      doDebug(options, '[waitForWorkflow > axios.get]', workflowRunStatusUrl, response);
    } catch (error) {
      doDebug(options, '[waitForWorkflow > axios.get]', workflowRunStatusUrl, error);
      throw new WaitForWorkflowError('failure', `Workflow run ${runId} status request failed: ${errorMessage(error)}`, {
        cause: error,
      });
    }

    const run = response.data;
    const status = run.status;
    const conclusion = run.conclusion;

    if (status === 'completed') {
      if (conclusion === 'success') {
        core.info(`Workflow run ${runId} completed successfully.`);
        return;
      }

      throw new WaitForWorkflowError(conclusion, `Workflow run ${runId} failed with conclusion: ${conclusion}`);
    }

    core.info(`Workflow run ${runId} is in status: ${status}. Waiting for ${waitInterval / 1000} seconds...`);
    await sleep(waitInterval);
  }

  core.setOutput('run_id', runId);
  throw new WorkflowTimeoutError(`Timeout waiting for workflow run ${runId} to complete.`);
}

export function getWorkflowRunStatusUrl({repo, runId}: Options): string {
  return `https://api.github.com/repos/${repo}/actions/runs/${runId}`;
}

run();
