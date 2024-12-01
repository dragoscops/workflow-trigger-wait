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
exports.createWorkflow = exports.CreateWorkflowError = void 0;
const core = __importStar(require("@actions/core"));
const github_api_url_1 = require("../../github-api-url");
const github_client_1 = require("../../github-client");
const utils_1 = require("../../utils");
class CreateWorkflowError extends utils_1.GenericError {
    runConclusion = 'workflow_failed';
}
exports.CreateWorkflowError = CreateWorkflowError;
async function createWorkflow(options) {
    const { ref, inputs, credentials } = options;
    const workflowUrl = github_api_url_1.GithubApiUrl.getInstance().workflowDispatch(options);
    core.info(`Calling ${workflowUrl}@${ref}`);
    try {
        const client = await (0, github_client_1.createGithubClient)(credentials);
        const response = await client.post(workflowUrl, {
            ref,
            inputs,
        });
        (0, utils_1.doDebug)(options, '[createWorkflow > axios.post]', workflowUrl, response);
        if (response.status !== 204) {
            throw new Error(response.statusText);
        }
    }
    catch (error) {
        (0, utils_1.doDebug)(options, '[createWorkflow > axios.post]', workflowUrl, error);
        throw new Error(`Failed to trigger workflow: ${(0, utils_1.errorMessage)(error)}`);
    }
    core.info(`Called ${workflowUrl}@${ref}`);
}
exports.createWorkflow = createWorkflow;
