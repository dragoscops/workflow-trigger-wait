import * as core from '@actions/core';
import { GithubAxios } from '../../github/axios.js';
import { doDebug } from '../../options.js';
import { sleep, errorMessage, GenericError } from '../../utils.js';
import { GithubApiUrl } from '../../github/api-url.js';
import { GithubUrl } from '../../github/url.js';
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
            doDebug(options, '[lastUncompletedRun > lastUncompletedRunAttempt]', error);
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
    const runsListUrl = githubApiUrl.runsList(options);
    const client = await GithubAxios.instance(options).create();
    doDebug(options, '[listRuns > GithubAxios.instance(...).create()]');
    const response = await client.get(runsListUrl);
    doDebug(options, '[listRuns > client.get]', runsListUrl, response);
    return response?.data?.workflow_runs ?? [];
}
export async function lastUncompletedRunAttempt(options) {
    const { ref, workflowId, runPattern } = options;
    const runs = await listRuns(options);
    const run = runs.find((r) => r.head_branch === ref &&
        r.path.endsWith(workflowId) &&
        r.status !== 'completed' &&
        (runPattern ? r.name.includes(runPattern) || new RegExp(runPattern).test(r.name) : true));
    if (!run) {
        return '';
    }
    return run.id.toString();
}
//# sourceMappingURL=list-runs.js.map