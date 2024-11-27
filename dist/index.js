"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowRunStatusUrl = exports.waitForWorkflow = exports.buildAxiosOptions = exports.getRunsListUrl = exports.determineWorkflowRunIdAttempt = exports.getWorkflowDetailsIdUrl = exports.determineWorkflowRunId = exports.createWorkflow = exports.CreateWorkflowError = exports.getWorkflowDispatchUrl = exports.triggerWorkflow = exports.TriggerWorkflowError = exports.InvalidWorkflowError = exports.runAction = exports.InputError = exports.GenericError = exports.sleep = exports.doDebug = exports.silentFail = exports.errorMessage = exports.actionTypes = void 0;
const core = require("@actions/core");
const axios_1 = require("axios");
const parse_duration_1 = require("parse-duration");
exports.actionTypes = ['trigger-and-wait', 'trigger-only', 'wait-only'];
function errorMessage(error) {
    return error instanceof Error ? error.message : JSON.stringify(error);
}
exports.errorMessage = errorMessage;
function silentFail(noThrow) {
    return ['true', 'yes'].includes(noThrow.toLowerCase());
}
exports.silentFail = silentFail;
function doDebug(options, ...values) {
    if (['true', 'yes'].includes((options.debug ?? 'no').toLowerCase())) {
        if (typeof values[0] === 'string') {
            console.log(`::group::${values[0]}`);
        }
        console.log(...values);
        if (typeof values[0] === 'string') {
            console.log('::endgroup::');
        }
    }
}
exports.doDebug = doDebug;
async function sleep(interval = 1000) {
    return new Promise((resolve) => setTimeout(resolve, interval));
}
exports.sleep = sleep;
async function run() {
    const options = {
        githubToken: core.getInput('github_token'),
        repo: core.getInput('repo'),
        workflowId: core.getInput('workflow_id'),
        ref: core.getInput('ref') || 'main',
        inputs: JSON.parse(core.getInput('inputs') || '{}'),
        waitInterval: (0, parse_duration_1.default)(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000,
        timeout: (0, parse_duration_1.default)(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000,
        action: core.getInput('action'),
        noThrow: core.getInput('no_throw') || 'false',
        runId: core.getInput('run_id'),
        debug: core.getInput('debug') || 'no',
    };
    try {
        await runAction(options);
        core.setOutput('run_conclusion', 'success');
    }
    catch (err) {
        console.log(err);
        const conclusion = err instanceof GenericError ? err.runConclusion ?? 'unknown' : 'unknown';
        core.setOutput('run_conclusion', conclusion);
        core.info(`Run Conclusion: ${conclusion}`);
        core.info(`Error: ${errorMessage(err)}`);
        doDebug(options, '[runAction]', err);
        if (silentFail(options.noThrow)) {
            core.warning('Silent fail enabled. Suppressing action failure.');
        }
        else {
            core.setFailed(`Action failed with error: ${errorMessage(err)}`);
        }
    }
}
exports.default = run;
class GenericError extends Error {
    runConclusion = 'unknown';
}
exports.GenericError = GenericError;
class InputError extends GenericError {
}
exports.InputError = InputError;
async function runAction(options) {
    const { action } = options;
    if (!exports.actionTypes.includes(action)) {
        throw new InputError(`Invalid action: ${action}`);
    }
    if (action.includes('trigger')) {
        options.runId = await triggerWorkflow(options);
    }
    if (action.includes('wait')) {
        if (!options.runId) {
            throw new InputError(`run_id is required for action: wait-only`);
        }
        await waitForWorkflow(options);
    }
}
exports.runAction = runAction;
class InvalidWorkflowError extends GenericError {
    runConclusion = 'invalid_workflow';
}
exports.InvalidWorkflowError = InvalidWorkflowError;
class TriggerWorkflowError extends GenericError {
    runConclusion = 'trigger_failed';
}
exports.TriggerWorkflowError = TriggerWorkflowError;
async function triggerWorkflow(options) {
    const { repo, workflowId } = options;
    if (!workflowId || !repo) {
        throw new InvalidWorkflowError(`Invalid workflowId or repo: ${workflowId} / ${repo}`);
    }
    try {
        await createWorkflow(options);
    }
    catch (error) {
        doDebug(options, '[triggerWorkflow > createWorkflow]', error);
        throw new TriggerWorkflowError(`Failed to trigger workflow: ${errorMessage(error)}`, { cause: error });
    }
    try {
        return determineWorkflowRunId(options);
    }
    catch (error) {
        doDebug(options, '[triggerWorkflow > determineWorkflowRunId]', error);
        throw new TriggerWorkflowError(`Failed to read workflow id: ${errorMessage(error)}`, { cause: error });
    }
}
exports.triggerWorkflow = triggerWorkflow;
function getWorkflowDispatchUrl({ repo, workflowId }) {
    const [owner, repoName] = repo.split('/');
    return `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
}
exports.getWorkflowDispatchUrl = getWorkflowDispatchUrl;
class CreateWorkflowError extends GenericError {
    runConclusion = 'workflow_failed';
}
exports.CreateWorkflowError = CreateWorkflowError;
async function createWorkflow(options) {
    const { ref, inputs, githubToken } = options;
    const workflowUrl = getWorkflowDispatchUrl(options);
    core.info(`Calling ${workflowUrl}@${ref}`);
    try {
        const response = await axios_1.default.post(workflowUrl, {
            ref,
            inputs,
        }, buildAxiosOptions(githubToken));
        doDebug(options, '[createWorkflow > axios.post]', workflowUrl, response);
        if (response.status !== 204) {
            throw new Error(response.statusText);
        }
    }
    catch (error) {
        doDebug(options, '[createWorkflow > axios.post]', workflowUrl, error);
        throw new Error(`Failed to trigger workflow: ${errorMessage(error)}`);
    }
    core.info(`Called ${workflowUrl}@${ref}`);
}
exports.createWorkflow = createWorkflow;
class DetermineWorkflowIdError extends TriggerWorkflowError {
}
async function determineWorkflowRunId(options) {
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
            runId = await determineWorkflowRunIdAttempt(options);
        }
        catch (error) {
            doDebug(options, '[determineWorkflowRunId > determineWorkflowRunIdAttempt]', error);
            throw new DetermineWorkflowIdError(`Failed to get workflow run ID: ${errorMessage(error)}`, { cause: error });
        }
        if (runId) {
            core.info(`Workflow run ID: ${runId}`);
            core.setOutput('run_id', runId);
            core.info(`For more info, visit ${getWorkflowDetailsIdUrl(options)}`);
            return runId;
        }
        await sleep(pollingInterval);
    }
    throw new DetermineWorkflowIdError('Failed to get workflow run ID after multiple polling attempts');
}
exports.determineWorkflowRunId = determineWorkflowRunId;
function getWorkflowDetailsIdUrl({ repo, runId }) {
    return `https://github.com/${repo}/actions/runs/${runId}`;
}
exports.getWorkflowDetailsIdUrl = getWorkflowDetailsIdUrl;
async function determineWorkflowRunIdAttempt(options) {
    const { ref, workflowId, githubToken } = options;
    const runsListUrl = getRunsListUrl(options);
    const response = await axios_1.default.get(runsListUrl, buildAxiosOptions(githubToken));
    doDebug(options, '[determineWorkflowRunIdAttempt > axios.get]', getRunsListUrl, response);
    const runs = response?.data?.workflow_runs ?? [];
    const run = runs.find((r) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed');
    if (!run) {
        return '';
    }
    return run.id.toString();
}
exports.determineWorkflowRunIdAttempt = determineWorkflowRunIdAttempt;
function getRunsListUrl({ repo }) {
    return `https://api.github.com/repos/${repo}/actions/runs`;
}
exports.getRunsListUrl = getRunsListUrl;
function buildAxiosOptions(githubToken) {
    return {
        headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    };
}
exports.buildAxiosOptions = buildAxiosOptions;
class WaitForWorkflowError extends GenericError {
    runConclusion;
    constructor(runConclusion, message, ...args) {
        super(message, ...args);
        this.runConclusion = runConclusion;
    }
}
class WorkflowTimeoutError extends GenericError {
    runConclusion = 'timeout';
}
async function waitForWorkflow(options) {
    const { runId, waitInterval, timeout, githubToken } = options;
    if (!runId) {
        throw new InputError(`Invalid runId: ${runId}`);
    }
    core.info(`Waiting for workflow ${runId}`);
    core.info(`For more info, visit ${getWorkflowDetailsIdUrl(options)}`);
    const startTime = Date.now();
    const workflowRunStatusUrl = getWorkflowRunStatusUrl(options);
    let response;
    while (Date.now() - startTime <= timeout) {
        try {
            response = await axios_1.default.get(workflowRunStatusUrl, buildAxiosOptions(githubToken));
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
exports.waitForWorkflow = waitForWorkflow;
function getWorkflowRunStatusUrl({ repo, runId }) {
    return `https://api.github.com/repos/${repo}/actions/runs/${runId}`;
}
exports.getWorkflowRunStatusUrl = getWorkflowRunStatusUrl;
run();
