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
exports.lastUncompletedRunAttempt = exports.listRuns = exports.lastUncompletedRun = void 0;
const core = __importStar(require("@actions/core"));
const github_client_1 = require("../../github-client");
const utils_1 = require("../../utils");
const github_api_url_1 = require("../../github-api-url");
const github_url_1 = require("../../github-url");
const githubApiUrl = github_api_url_1.GithubApiUrl.getInstance();
const githubUrl = github_url_1.GithubUrl.getInstance();
class DetermineWorkflowIdError extends utils_1.GenericError {
}
async function lastUncompletedRun(options) {
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
            (0, utils_1.doDebug)(options, '[determineWorkflowRunId > determineWorkflowRunIdAttempt]', error);
            throw new DetermineWorkflowIdError(`Failed to get workflow run ID: ${(0, utils_1.errorMessage)(error)}`, { cause: error });
        }
        if (runId) {
            core.info(`Workflow run ID: ${runId}`);
            core.setOutput('run_id', runId);
            core.info(`For more info, visit ${githubUrl.workflowDetailsId(options)}`);
            return runId;
        }
        await (0, utils_1.sleep)(pollingInterval);
    }
    throw new DetermineWorkflowIdError('Failed to get workflow run ID after multiple polling attempts');
}
exports.lastUncompletedRun = lastUncompletedRun;
async function listRuns(options) {
    const { credentials } = options;
    const runsListUrl = githubApiUrl.runsList(options);
    const client = await (0, github_client_1.createGithubClient)(credentials);
    const response = await client.get(runsListUrl);
    (0, utils_1.doDebug)(options, '[determineWorkflowRunIdAttempt > axios.get]', runsListUrl, response);
    return response?.data?.workflow_runs ?? [];
}
exports.listRuns = listRuns;
async function lastUncompletedRunAttempt(options) {
    const { ref, workflowId } = options;
    const runs = await listRuns(options);
    const run = runs.find((r) => r.head_branch === ref && r.path.endsWith(workflowId) && r.status !== 'completed');
    if (!run) {
        return '';
    }
    return run.id.toString();
}
exports.lastUncompletedRunAttempt = lastUncompletedRunAttempt;
