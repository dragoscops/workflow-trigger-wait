/* eslint-disable max-lines-per-function */
import * as core from '@actions/core';
import axios from 'axios';
import parseDuration from 'parse-duration';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github_token');
    const repo = core.getInput('repo');
    const workflowId = core.getInput('workflow_id');
    const ref = core.getInput('ref');
    const inputs = JSON.parse(core.getInput('inputs') || '{}');
    const waitInterval = parseDuration(core.getInput('wait_interval') || '1h', 'ms') || 60 * 60 * 1000;
    const timeout = parseDuration(core.getInput('timeout') || '10s', 'ms') || 10 * 1000;
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
      await waitForWorkflows(parseInt(runId), repo, waitInterval, timeout, githubToken);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

async function triggerWorkflow(
  repo: string,
  workflowId: string,
  ref: string,
  inputs: Record<string, string>,
  githubToken: string,
): Promise<string> {
  if (!workflowId || !repo) {
    throw new Error(`Invalid workflowId or repo to trigger: ${repo} / ${workflowId}`);
  }

  const [owner, repoName] = repo.split('/');
  const response = await axios.post(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`,
    {
      ref,
      inputs,
    },
    {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    },
  );

  core.info(`Triggered workflow: ${workflowId} for ${repo} on ref ${ref}`);

  if (response.status !== 204) {
    throw new Error(`Failed to trigger workflow: ${response.statusText}`);
  }

  // Extracting the run_id from the response
  const runId = response.data.id;
  core.setOutput('run_id', runId.toString());

  core.info(`Workflow run ID: ${runId}`);

  return runId;
}

async function waitForWorkflows(
  runId: number,
  repo: string,
  interval: number,
  timeout: number,
  githubToken: string,
): Promise<void> {
  if (!runId) {
    throw new Error(`Invalid runId to wait for: ${runId}`);
  }

  const [owner, repoName] = repo.split('/');
  const startTime = Date.now();

  while (Date.now() - startTime <= timeout + 1000) {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/actions/runs/${runId}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

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

    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for workflow run ${runId} to complete.`);
    }

    core.info(`Workflow run ${runId} is in status: ${status}. Waiting for ${interval / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

run();
