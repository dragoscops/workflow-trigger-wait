"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
const parse_duration_1 = require("parse-duration");
async function run() {
    try {
        const githubToken = core.getInput('github_token');
        const repo = core.getInput('repo');
        const workflowId = core.getInput('workflow_id');
        const ref = core.getInput('ref');
        const inputs = JSON.parse(core.getInput('inputs') || '{}');
        const waitInterval = (0, parse_duration_1.default)(core.getInput('wait_interval') || '30m', 'ms') || 30 * 60 * 1000;
        const timeout = (0, parse_duration_1.default)(core.getInput('timeout') || '1s', 'ms') || 1000;
        const action = core.getInput('action');
        let runId = core.getInput('run_id');
        const allActions = ['trigger-and-wait', 'trigger-only', 'wait-only'];
        if (!allActions.includes(action)) {
            throw new Error(`Invalid action: ${action}`);
        }
        if (['trigger-and-wait', 'trigger-only'].includes(action) && (!workflowId || !repo)) {
            throw new Error(`Invalid workflowId or repo to trigger: ${repo} / ${workflowId}`);
        }
        if ('wait-only' === action && !runId) {
            throw new Error(`Invalid runId to wait for: ${runId}`);
        }
        const [owner, repoName] = repo.split('/');
        if (action.includes('trigger')) {
            const octokit = github.getOctokit(githubToken);
            const response = await octokit.actions.createWorkflowDispatch({
                owner,
                repo: repoName,
                workflow_id: workflowId,
                ref,
                inputs,
            });
            core.info(`Triggered workflow: ${workflowId} for ${repo} on ref ${ref}`);
            if (response.status !== 204) {
                throw new Error(`Failed to trigger workflow: ${response.statusText}`);
            }
            runId = response.data.id;
            core.setOutput('run_id', runId.toString());
            core.info(`Workflow run ID: ${runId}`);
        }
        if (action.includes('wait')) {
            if (!runId) {
                throw new Error(`run_id is required for action: wait-only`);
            }
            await waitForWorkflows(parseInt(runId), owner, repoName, waitInterval, timeout);
        }
    }
    catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}
async function waitForWorkflows(runId, owner, repo, interval, timeout) {
    const githubToken = core.getInput('github_token');
    const octokit = github.getOctokit(githubToken);
    const startTime = Date.now();
    while (Date.now() - startTime <= timeout + 1000) {
        const { data: run } = await octokit.actions.getWorkflowRun({
            owner,
            repo,
            run_id: runId,
        });
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
