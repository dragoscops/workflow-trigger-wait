import * as core from '@actions/core';
import { createGithubClient } from '../../github-client.js';
import { doDebug, sleep, errorMessage, GenericError } from '../../utils.js';
import { GithubApiUrl } from '../../github-api-url.js';
import { GithubUrl } from '../../github-url.js';
const githubApiUrl = GithubApiUrl.getInstance();
const githubUrl = GithubUrl.getInstance();
class DetermineWorkflowIdError extends GenericError {
}
export async function lastUncompletedRun(options) {
    const determineRunId = {
        pollingInterval: 5000,
        maxPollingAttempts: 12,
        ...(options.determineRunId ?? {}),
    };
    const { maxPollingAttempts, pollingInterval } = determineRunId;
    let runId = '';
    for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
        core.info(`Polling attempt  to get run ID...`);
        try {
            runId = await lastUncompletedRunAttempt(options);
        }
        catch (error) {
            doDebug(options, '[determineWorkflowRunId > determineWorkflowRunIdAttempt]', error);
            throw new DetermineWorkflowIdError(`Failed to get workflow run ID: ${errorMessage(error)}`, { cause: error });
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
export async function listRuns(options) {
    const { credentials } = options;
    const runsListUrl = githubApiUrl.runsList(options);
    const client = await createGithubClient(credentials);
    const response = await client.get(runsListUrl);
    doDebug(options, '[determineWorkflowRunIdAttempt > axios.get]', runsListUrl, response);
    return response?.data?.workflow_runs ?? [];
}
export async function lastUncompletedRunAttempt(options) {
    const { ref, workflowId } = options;
    const runs = await listRuns(options);
    const run = runs.find((r) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed');
    if (!run) {
        return '';
    }
    return run.id.toString();
}