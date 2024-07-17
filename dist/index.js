"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowStatusUrl = exports.waitForWorkflow = exports.buildAxiosOptions = exports.getWorkflowRunIdUrl = exports.determineWorkflowRunId = exports.getTriggerWorkflowUrl = exports.triggerWorkflow = void 0;
const core = require("@actions/core");
const axios_1 = require("axios");
const parse_duration_1 = require("parse-duration");
async function run() {
    try {
        const githubToken = core.getInput('github_token');
        const repo = core.getInput('repo');
        const workflowId = core.getInput('workflow_id');
        const ref = core.getInput('ref') || 'main';
        const inputs = JSON.parse(core.getInput('inputs') || '{}');
        const waitInterval = (0, parse_duration_1.default)(core.getInput('wait_interval') || '10s', 'ms') || 10 * 1000;
        const timeout = (0, parse_duration_1.default)(core.getInput('timeout') || '1h', 'ms') || 60 * 60 * 1000;
        const action = core.getInput('action');
        const noThrow = core.getInput('no_throw');
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
            await waitForWorkflow(repo, parseInt(runId), waitInterval, timeout, githubToken, noThrow);
        }
    }
    catch (error) {
        console.log(error);
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}
exports.default = run;
async function triggerWorkflow(repo, workflowId, ref, inputs, githubToken) {
    if (!workflowId || !repo) {
        throw new Error(`Invalid workflowId or repo: ${repo} / ${workflowId}`);
    }
    const [owner, repoName] = repo.split('/');
    core.info(`Calling ${getTriggerWorkflowUrl(owner, repoName, workflowId)}`);
    const response = await axios_1.default.post(getTriggerWorkflowUrl(owner, repoName, workflowId), {
        ref,
        inputs,
    }, buildAxiosOptions(githubToken));
    core.info(`Triggered workflow: ${workflowId} for ${repo} on ref ${ref}`);
    if (response.status !== 204) {
        throw new Error(`Failed to trigger workflow: ${response.statusText}`);
    }
    let runId = '';
    const pollingInterval = 5000;
    const maxPollingAttempts = 12;
    for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
        core.info(`Polling attempt ${attempt} to get run ID...`);
        runId = await determineWorkflowRunId(owner, repoName, ref, githubToken);
        if (runId) {
            core.info(`Workflow run ID: ${runId}`);
            core.setOutput('run_id', runId);
            return runId;
        }
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
    }
    throw new Error('Failed to get workflow run ID after multiple polling attempts');
}
exports.triggerWorkflow = triggerWorkflow;
function getTriggerWorkflowUrl(owner, repoName, workflowId) {
    return `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
}
exports.getTriggerWorkflowUrl = getTriggerWorkflowUrl;
async function determineWorkflowRunId(owner, repoName, ref, githubToken) {
    const response = await axios_1.default.get(getWorkflowRunIdUrl(owner, repoName), buildAxiosOptions(githubToken));
    const runs = response.data.workflow_runs;
    const run = runs.find((r) => r.head_branch === ref && r.status !== 'completed');
    if (!run) {
        return '';
    }
    return run.id.toString();
}
exports.determineWorkflowRunId = determineWorkflowRunId;
function getWorkflowRunIdUrl(owner, repoName) {
    return `https://api.github.com/repos/${owner}/${repoName}/actions/runs`;
}
exports.getWorkflowRunIdUrl = getWorkflowRunIdUrl;
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
async function waitForWorkflow(repo, runId, interval, timeout, githubToken, noThrow) {
    if (!runId) {
        throw new Error(`Invalid runId: ${runId}`);
    }
    const [owner, repoName] = repo.split('/');
    const startTime = Date.now();
    while (Date.now() - startTime <= timeout) {
        const response = await axios_1.default.get(getWorkflowStatusUrl(owner, repoName, runId), buildAxiosOptions(githubToken));
        const run = response.data;
        const status = run.status;
        const conclusion = run.conclusion;
        if (status === 'completed') {
            if (conclusion === 'success') {
                core.info(`Workflow run ${runId} completed successfully.`);
                return;
            }
            if (!['true', 'yes'].includes(noThrow.toLowerCase())) {
                throw new Error(`Workflow run ${runId} failed with conclusion: ${conclusion}`);
            }
            else {
                core.setOutput('run_id', runId);
                core.setOutput('W', conclusion);
                return;
            }
        }
        core.info(`Workflow run ${runId} is in status: ${status}. Waiting for ${interval / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
    if (!['true', 'yes'].includes(noThrow.toLowerCase())) {
        throw new Error(`Timeout waiting for workflow run ${runId} to complete.`);
    }
    else {
        core.setOutput('run_id', runId);
        core.setOutput('run_conclusion', 'timeout');
    }
}
exports.waitForWorkflow = waitForWorkflow;
function getWorkflowStatusUrl(owner, repoName, runId) {
    return `https://api.github.com/repos/${owner}/${repoName}/actions/runs/${runId}`;
}
exports.getWorkflowStatusUrl = getWorkflowStatusUrl;
run();
