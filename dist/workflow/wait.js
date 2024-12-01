"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForWorkflow = exports.WorkflowTimeoutError = exports.WaitForWorkflowError = void 0;
const core = __importStar(require("@actions/core"));
const github_api_url_1 = require("../github-api-url");
const github_client_1 = require("../github-client");
const github_url_1 = require("../github-url");
const utils_1 = require("../utils");
class WaitForWorkflowError extends utils_1.GenericError {
    runConclusion;
    constructor(runConclusion, message, ...args) {
        super(message, ...args);
        this.runConclusion = runConclusion;
    }
}
exports.WaitForWorkflowError = WaitForWorkflowError;
class WorkflowTimeoutError extends utils_1.GenericError {
    runConclusion = 'timeout';
}
exports.WorkflowTimeoutError = WorkflowTimeoutError;
async function waitForWorkflow(options) {
    const { runId, waitInterval, timeout, credentials } = options;
    if (!runId) {
        throw new utils_1.InputError(`Invalid runId: ${runId}`);
    }
    core.info(`Waiting for workflow ${runId}`);
    core.info(`For more info, visit ${github_url_1.GithubUrl.getInstance().workflowDetailsId(options)}`);
    const startTime = Date.now();
    const workflowRunStatusUrl = github_api_url_1.GithubApiUrl.getInstance().workflowRunStatus(options);
    let response;
    while (Date.now() - startTime <= timeout) {
        try {
            const client = await (0, github_client_1.createGithubClient)(credentials);
            response = await client.get(workflowRunStatusUrl);
            (0, utils_1.doDebug)(options, '[waitForWorkflow > axios.get]', workflowRunStatusUrl, response);
        }
        catch (error) {
            (0, utils_1.doDebug)(options, '[waitForWorkflow > axios.get]', workflowRunStatusUrl, error);
            throw new WaitForWorkflowError('failure', `Workflow run ${runId} status request failed: ${(0, utils_1.errorMessage)(error)}`, {
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
        await (0, utils_1.sleep)(waitInterval);
    }
    core.setOutput('run_id', runId);
    throw new WorkflowTimeoutError(`Timeout waiting for workflow run ${runId} to complete.`);
}
exports.waitForWorkflow = waitForWorkflow;
