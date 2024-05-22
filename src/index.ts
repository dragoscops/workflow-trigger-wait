/* eslint-disable max-lines-per-function */
import * as core from '@actions/core';
import axios, {AxiosRequestConfig} from 'axios';
import parseDuration from 'parse-duration';

export default async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github_token');
    const repo = core.getInput('repo');
    const workflowId = core.getInput('workflow_id');
    const ref = core.getInput('ref') || 'main';
    const inputs = JSON.parse(core.getInput('inputs') || '{}');
    const waitInterval = parseDuration(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000;
    const timeout = parseDuration(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000;
    const action = core.getInput('action');
    let runId = core.getInput('run_id');

    const allActions = ['trigger-and-wait', 'trigger-only', 'wait-only'];

    if (!allActions.includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    if (action.includes('trigger')) {
      runId = await triggerWorkflow(repo, workflowId, ref, inputs, githubToken);
    }

    if (action.includes('wait')) {
      if (!runId) {
        throw new Error(`run_id is required for action: wait-only`);
      }
      await waitForWorkflow(repo, parseInt(runId), waitInterval, timeout, githubToken);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

export async function triggerWorkflow(
  repo: string,
  workflowId: string,
  ref: string,
  inputs: Record<string, string>,
  githubToken: string,
): Promise<string> {
  if (!workflowId || !repo) {
    throw new Error(`Invalid workflowId or repo: ${repo} / ${workflowId}`);
  }

  const [owner, repoName] = repo.split('/');
  core.info(`Calling ${getTriggerWorkflowUrl(owner, repoName, workflowId)}`);

  const response = await axios.post(
    getTriggerWorkflowUrl(owner, repoName, workflowId),
    {
      ref,
      inputs,
    },
    buildAxiosOptions(githubToken),
  );

  core.info(`Triggered workflow: ${workflowId} for ${repo} on ref ${ref}`);

  if (response.status !== 204) {
    throw new Error(`Failed to trigger workflow: ${response.statusText}`);
  }

  // Since GitHub's API for dispatching a workflow does not return run_id, this part will need to be adjusted.
  // Here, we're assuming a way to obtain the run_id after triggering, which needs actual implementation.
  const runId = await determineWorkflowRunId(owner, repoName, ref, githubToken);
  core.setOutput('run_id', runId.toString());

  core.info(`Workflow run ID: ${runId}`);

  return runId;
}

export function getTriggerWorkflowUrl(owner: string, repoName: string, workflowId: string) {
  return `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
}

export async function determineWorkflowRunId(
  owner: string,
  repoName: string,
  ref: string,
  githubToken: string,
): Promise<string> {
  // Implement logic to fetch the most recent workflow run id based on the ref
  // Placeholder implementation, please replace with actual logic
  const response = await axios.get(getWorkflowRunIdUrl(owner, repoName), buildAxiosOptions(githubToken));

  const runs = response.data.workflow_runs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = runs.find((r: any) => r.head_branch === ref && r.status !== 'completed');
  if (!run) {
    throw new Error(`No running workflow found for ref ${ref}`);
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

export async function waitForWorkflow(
  repo: string,
  runId: number,
  interval: number,
  timeout: number,
  githubToken: string,
): Promise<void> {
  if (!runId) {
    throw new Error(`Invalid runId: ${runId}`);
  }

  const [owner, repoName] = repo.split('/');
  const startTime = Date.now();

  while (Date.now() - startTime <= timeout) {
    const response = await axios.get(getWorkflowStatusUrl(owner, repoName, runId), buildAxiosOptions(githubToken));

    const run = response.data;
    const status = run.status;
    const conclusion = run.conclusion;

    if (status === 'completed') {
      if (conclusion === 'success') {
        core.info(`Workflow run ${runId} completed successfully.`);
        return;
      }
      throw new Error(`Workflow run ${runId} failed with conclusion: ${conclusion}`);
    }

    core.info(`Workflow run ${runId} is in status: ${status}. Waiting for ${interval / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for workflow run ${runId} to complete.`);
}

export function getWorkflowStatusUrl(owner: string, repoName: string, runId: number) {
  return `https://api.github.com/repos/${owner}/${repoName}/actions/runs/${runId}`;
}

run();
