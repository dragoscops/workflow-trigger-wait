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
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

export function silentFail(noThrow: string): boolean {
  return ['true', 'yes'].includes(noThrow.toLowerCase());
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
  };

  try {
    await runAction(options);
  } catch (error) {
    console.log(error);
    core.setFailed(`Action failed with error: ${errorMessage(error)}`);
  }
}

export class InputError extends Error {}

export async function runAction(options: Options) {
  const {action} = options;

  if (!actionTypes.includes(action)) {
    throw new InputError(`Invalid action: ${action}`);
  }

  if (action.includes('trigger')) {
    options.runId = await triggerWorkflow(options);
  }

  if (options.action.includes('wait')) {
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
  const {repo, workflowId, ref, inputs, githubToken} = options;

  if (!workflowId || !repo) {
    throw new InvalidWorkflowError(`Invalid workflowId or repo: ${workflowId} / ${repo}`);
  }

  const workflowUrl = getTriggerWorkflowUrl(options);
  try {
    await createWorkflow({workflowUrl, ref, inputs, githubToken});
  } catch (error) {
    throw new TriggerWorkflowError(`Failed to trigger workflow: ${errorMessage(error)}`, {cause: error});
  }

  // Since GitHub's API for dispatching a workflow does not return run_id, this part will need to be adjusted.
  // Here, we're assuming a way to obtain the run_id after triggering, which needs actual implementation.
  try {
    return determineWorkflowRunId(options);
  } catch (error) {
    throw new TriggerWorkflowError(`Failed to read workflow id: ${errorMessage(error)}`, {cause: error});
  }
}

export function getTriggerWorkflowUrl({repo, workflowId}: Options) {
  const [owner, repoName] = repo.split('/');
  return `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
}

async function createWorkflow({
  workflowUrl,
  ref,
  inputs,
  githubToken,
}: {
  workflowUrl: string;
  ref: string;
  inputs: Record<string, string>;
  githubToken: string;
}): Promise<void> {
  core.info(`Calling ${workflowUrl}@${ref}`);
  const response = await axios.post(
    workflowUrl,
    {
      ref,
      inputs,
    },
    buildAxiosOptions(githubToken),
  );
  core.info(`Called ${workflowUrl}@${ref}`);

  if (response.status !== 204) {
    throw new Error(`Failed to trigger workflow: ${response.statusText}`);
  }
}

class DetermineWorkflowIdError extends TriggerWorkflowError {}

export async function determineWorkflowRunId({repo, ref, workflowId, githubToken}: Options): Promise<string> {
  const pollingInterval = 5000; // 5 seconds
  const maxPollingAttempts = 12; // 1 minute
  const [owner, repoName] = repo.split('/');
  let runId = '';

  for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
    core.info(`Polling attempt  to get run ID...`);
    try {
      runId = await determineWorkflowRunIdAttempt(owner, repoName, ref, workflowId, githubToken);
    } catch (error) {
      throw new DetermineWorkflowIdError(`Failed to get workflow run ID: ${errorMessage(error)}`, {cause: error});
    }

    if (runId) {
      core.info(`Workflow run ID: `);
      core.setOutput('run_id', runId);
      core.info(`For more info, visit https://github.com/${repo}/actions/runs/${runId}`);
      return runId;
    }

    await sleep(pollingInterval);
  }

  throw new DetermineWorkflowIdError('Failed to get workflow run ID after multiple polling attempts');
}

export async function determineWorkflowRunIdAttempt(
  owner: string,
  repoName: string,
  ref: string,
  workflowId: string,
  githubToken: string,
): Promise<string> {
  // Implement logic to fetch the most recent workflow run id based on the ref
  // Placeholder implementation, please replace with actual logic
  const response = await axios.get(getWorkflowRunIdUrl(owner, repoName), buildAxiosOptions(githubToken));

  const runs = response.data.workflow_runs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = runs.find((r: any) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed');
  if (!run) {
    return '';
  }

  return run.id.toString();
}

export function getWorkflowRunIdUrl(owner: string, repoName: string) {
  return `https://api.github.com/repos/${owner}/${repoName}/actions/runs`;
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
  ) {
    super(message);
  }
}

class WorkflowTimeoutError extends Error {
  runConclusion = 'timeout';
}

// eslint-disable-next-line max-params
export async function waitForWorkflow(options: Options): Promise<void> {
  const {repo, runId, waitInterval, timeout, githubToken} = options;
  if (!runId) {
    throw new InputError(`Invalid runId: ${runId}`);
  }

  core.info(`Waiting for workflow ${runId}`);
  core.info(`For more info, visit https://github.com/${repo}/actions/runs/${runId}`);
  const startTime = Date.now();

  while (Date.now() - startTime <= timeout) {
    const url = getWorkflowStatusUrl(options);
    const response = await axios.get(url, buildAxiosOptions(githubToken));

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

export function getWorkflowStatusUrl({repo, runId}: Options): string {
  const [owner, repoName] = repo.split('/');
  return `https://api.github.com/repos/${owner}/${repoName}/actions/runs/${runId}`;
}

run();
