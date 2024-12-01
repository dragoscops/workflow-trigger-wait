import * as core from '@actions/core';

import {createGithubClient} from '../../github-client';
import {Options} from '../../options';
import {doDebug, sleep, errorMessage, GenericError} from '../../utils';
import {GithubApiUrl} from '../../github-api-url';
import {GithubUrl} from '../../github-url';

const githubApiUrl = GithubApiUrl.getInstance();
const githubUrl = GithubUrl.getInstance();

class DetermineWorkflowIdError extends GenericError {}

export async function lastUncompletedRun(options: Options): Promise<string> {
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
      runId = await lastUncompletedRunAttempt(options);
    } catch (error) {
      doDebug(options, '[determineWorkflowRunId > determineWorkflowRunIdAttempt]', error);
      throw new DetermineWorkflowIdError(`Failed to get workflow run ID: ${errorMessage(error)}`, {cause: error});
    }

    if (runId) {
      core.info(`Workflow run ID: ${runId}`);
      core.setOutput('run_id', runId);
      core.info(`For more info, visit ${githubUrl.workflowDetailsId(options)}`);
      return runId;
    }

    await sleep(pollingInterval);
  }

  throw new DetermineWorkflowIdError('Failed to get workflow run ID after multiple polling attempts');
}

interface WorkflowRun {
  id: number;
  head_branch: string;
  status: string;
  path: string;
  [key: string]: unknown;
}

export async function listRuns(options: Options): Promise<WorkflowRun[]> {
  const {credentials} = options;
  const runsListUrl = githubApiUrl.runsList(options);

  const client = await createGithubClient(credentials);
  const response = await client.get(runsListUrl);
  doDebug(options, '[determineWorkflowRunIdAttempt > axios.get]', runsListUrl, response);

  return response?.data?.workflow_runs ?? [];
}

export async function lastUncompletedRunAttempt(options: Options): Promise<string> {
  const {ref, workflowId} = options;

  const runs = await listRuns(options);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = runs.find(
    (r: WorkflowRun) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed',
  );
  if (!run) {
    return '';
  }
  return run.id.toString();
}