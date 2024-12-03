import * as core from '@actions/core';
import {GithubApiUrl} from '../github-api-url.js';
import {createGithubClient} from '../github-client.js';
import {GithubUrl} from '../github-url.js';
import {Options} from '../options.js';
import {doDebug, sleep, errorMessage, GenericError, InputError} from '../utils.js';

export class WaitForWorkflowError extends GenericError {
  constructor(
    public runConclusion: string,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) {
    super(message, ...args);
  }
}

export class WorkflowTimeoutError extends GenericError {
  runConclusion = 'timeout';
}

// eslint-disable-next-line max-params
export async function waitForWorkflow(options: Options): Promise<void> {
  const {runId, waitInterval, timeout} = options;
  if (!runId) {
    throw new InputError(`Invalid runId: ${runId}`);
  }

  core.info(`Waiting for workflow ${runId}`);
  core.info(`For more info, visit ${GithubUrl.getInstance().workflowDetailsId(options)}`);
  const startTime = Date.now();

  const workflowRunStatusUrl = GithubApiUrl.getInstance().workflowRunStatus(options);
  let response;
  while (Date.now() - startTime <= timeout) {
    try {
      const client = await createGithubClient(options);
      response = await client.get(workflowRunStatusUrl);
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
