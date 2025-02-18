import * as core from '@actions/core';

import {GithubAxios} from '../../github/axios.js';
import {doDebug, Options} from '../../options.js';
import {sleep, errorMessage, GenericError} from '../../utils.js';
import {GithubApiUrl} from '../../github/api-url.js';
import {GithubUrl} from '../../github/url.js';
// import {isDeepStrictEqual} from 'util';

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
      console.log(attempt, 'attempt failed');
      doDebug(options, '[lastUncompletedRun > lastUncompletedRunAttempt]', error);
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
  const runsListUrl = githubApiUrl.runsList(options);

  const client = await GithubAxios.instance(options).create();
  doDebug(options, '[listRuns > GithubAxios.instance(...).create()]');
  const response = await client.get(runsListUrl);
  doDebug(options, '[listRuns > client.get]', runsListUrl, response);

  return response?.data?.workflow_runs ?? [];
}

export async function lastUncompletedRunAttempt(options: Options): Promise<string> {
  const {ref, workflowId} = options;
  // const {ref, workflowId, inputs} = options;

  const runs = await listRuns(options);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  const run = runs.find(
    (r: WorkflowRun) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed',
  );
  if (!run) {
    return '';
  }

  const runDetails = getRunDetails(options, run.id);

  return run.id.toString();
}

export async function getRunDetails(options: Options, runId: number): Promise<any> {
  const runDetailsUrl = githubApiUrl.runDetails(options, runId);

  const client = await GithubAxios.instance(options).create();
  doDebug(options, '[getRunDetails > GithubAxios.instance(...).create()]');
  const response = await client.get(runDetailsUrl);
  doDebug(options, '[getRunDetails > client.get]', runDetailsUrl, response);

  return response?.data;
}
