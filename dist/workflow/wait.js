import * as core from '@actions/core';
import { GithubApiUrl } from '../github/api-url.js';
import { GithubAxios } from '../github/axios.js';
import { GithubUrl } from '../github/url.js';
import { doDebug } from '../options.js';
import { sleep, errorMessage, GenericError, InputError } from '../utils.js';
export class WaitForWorkflowError extends GenericError {
    runConclusion;
    constructor(runConclusion, message, ...args) {
        super(message, ...args);
        this.runConclusion = runConclusion;
    }
}
export class WorkflowTimeoutError extends GenericError {
    runConclusion = 'timeout';
}
export async function waitForWorkflow(options) {
    const { runId, waitInterval, timeout } = options;
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
            const client = await GithubAxios.instance(options).create();
            response = await client.get(workflowRunStatusUrl);
            doDebug(options, '[waitForWorkflow > axios.get]', workflowRunStatusUrl, response);
        }
        catch (error) {
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
//# sourceMappingURL=wait.js.map