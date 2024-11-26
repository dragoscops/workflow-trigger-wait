/* eslint-disable max-lines-per-function */
import * as core from '@actions/core';
import axios, {AxiosRequestConfig} from 'axios';
import parseDuration from 'parse-duration';

const actionTypes = ['trigger-and-wait', 'trigger-only', 'wait-only'] as const;

type ActionType = (typeof actionTypes)[number];

type ActionOptions = {
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

export default async function run(): Promise<void> {
  try {
    const options: ActionOptions = {
      githubToken: core.getInput('github_token'),
      repo: core.getInput('repo'),
      workflowId: core.getInput('workflow_id'),
      ref: core.getInput('ref') || 'main',
      inputs: JSON.parse(core.getInput('inputs') || '{}'),
      waitInterval: parseDuration(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000,
      timeout: parseDuration(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000,
      action: core.getInput('action') as ActionType,
      noThrow: core.getInput('no_throw'),
      runId: core.getInput('run_id'),
    };

    if (!actionTypes.includes(options.action)) {
      throw new Error(`Invalid action: ${options.action}`);
    }

    if (options.action.includes('trigger')) {
      options.runId = await createWorkflow(options);
    }

    if (options.action.includes('wait')) {
      if (!options.runId) {
        throw new Error(`run_id is required for action: wait-only`);
      }
      await waitForWorkflow(options);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    core.setFailed(`Action failed with error: ${(error as Error).message}`);
  }
}

export async function createWorkflow({
  repo,
  workflowId,
  ref,
  inputs,
  githubToken,
  noThrow = 'false',
}: {
  repo: string;
  workflowId: string;
  ref: string;
  inputs: Record<string, string>;
  githubToken: string;
  noThrow?: string;
}): Promise<string> {
  if (!workflowId || !repo) {
    if (!silentFail(noThrow)) {
      throw new Error(`Invalid workflowId or repo:  / `);
    } else {
      core.error(`Invalid workflowId or repo:  / `);
      core.setOutput('run_conclusion', 'invalid_workflow');
      return '';
    }
  }

  const [owner, repoName] = repo.split('/');
  const workflowUrl = getTriggerWorkflowUrl(owner, repoName, workflowId);

  try {
    await triggerWorkflow({workflowUrl, ref, inputs, githubToken});
  } catch (error) {
    if (!silentFail(noThrow)) {
      throw error;
    } else {
      core.error(`Failed to trigger workflow: ${(error as Error).message}`);
      core.setOutput('run_conclusion', 'trigger_failed');
      return '';
    }
  }

  // Since GitHub's API for dispatching a workflow does not return run_id, this part will need to be adjusted.
  // Here, we're assuming a way to obtain the run_id after triggering, which needs actual implementation.
  try {
    return await determineWorkflowRunId(owner, repoName, ref, workflowId, githubToken);
  } catch (error) {
    if (!silentFail(noThrow)) {
      throw error;
    } else {
      core.error(`Failed to read workflow id: ${(error as Error).message}`);
      core.setOutput('run_conclusion', 'trigger_failed');
      return '';
    }
  }
}

export function getTriggerWorkflowUrl(owner: string, repoName: string, workflowId: string) {
  return `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
}

async function triggerWorkflow({
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

async function determineWorkflowRunId(
  owner: string,
  repoName: string,
  ref: string,
  workflowId: string,
  githubToken: string,
): Promise<string> {
  const pollingInterval = 5000; // 5 seconds
  const maxPollingAttempts = 12; // 1 minute
  let runId = '';
  for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
    core.info(`Polling attempt  to get run ID...`);
    runId = await determineWorkflowRunIdAttempt(owner, repoName, ref, workflowId, githubToken);

    if (runId) {
      core.info(`Workflow run ID: `);
      core.setOutput('run_id', runId);
      core.info(`For more info, visit https://github.com//actions/runs/`);
      return runId;
    }

    await new Promise((resolve) => setTimeout(resolve, pollingInterval));
  }

  throw new Error('Failed to get workflow run ID after multiple polling attempts');
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

// eslint-disable-next-line max-params
export async function waitForWorkflow({
  repo,
  runId,
  interval,
  timeout,
  githubToken,
  noThrow,
}: ActionOptions & {interval: number}): Promise<void> {
  if (!runId) {
    throw new Error(`Invalid runId: ${runId}`);
  }
  core.info(`Waiting for workflow ${runId}`);
  core.info(`For more info, visit https://github.com/${repo}/actions/runs/${runId}`);

  const [owner, repoName] = repo.split('/');
  const startTime = Date.now();

  while (Date.now() - startTime <= timeout) {
    const url = getWorkflowStatusUrl(owner, repoName, runId);
    // core.info(`Interrogating ${url}`);
    const response = await axios.get(url, buildAxiosOptions(githubToken));

    const run = response.data;
    const status = run.status;
    const conclusion = run.conclusion;

    if (status === 'completed') {
      if (conclusion === 'success') {
        core.info(`Workflow run ${runId} completed successfully.`);
        return;
      }

      if (!silentFail(noThrow)) {
        throw new Error(`Workflow run ${runId} failed with conclusion: ${conclusion}`);
      } else {
        core.error(`Workflow run ${runId} failed with conclusion: ${conclusion}`);
        core.setOutput('run_id', runId);
        core.setOutput('run_conclusion', conclusion);
        return;
      }
    }

    core.info(`Workflow run ${runId} is in status: ${status}. Waiting for ${interval / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  if (!silentFail(noThrow)) {
    throw new Error(`Timeout waiting for workflow run ${runId} to complete.`);
  } else {
    core.setOutput('run_id', runId);
    core.setOutput('run_conclusion', 'timeout');
  }
}

export function getWorkflowStatusUrl(owner: string, repoName: string, runId: number) {
  return `https://api.github.com/repos/${owner}/${repoName}/actions/runs/${runId}`;
}

function silentFail(noThrow: string): boolean {
  return ['true', 'yes'].includes(noThrow.toLowerCase());
}

run();
