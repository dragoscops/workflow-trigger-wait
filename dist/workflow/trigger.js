"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerWorkflow = exports.TriggerWorkflowError = exports.InvalidWorkflowError = void 0;
const create_1 = require("./trigger/create");
const list_runs_1 = require("./trigger/list-runs");
const utils_1 = require("../utils");
class InvalidWorkflowError extends utils_1.GenericError {
    runConclusion = 'invalid_workflow';
}
exports.InvalidWorkflowError = InvalidWorkflowError;
class TriggerWorkflowError extends utils_1.GenericError {
    runConclusion = 'trigger_failed';
}
exports.TriggerWorkflowError = TriggerWorkflowError;
async function triggerWorkflow(options) {
    const { repo, workflowId } = options;
    if (!workflowId || !repo) {
        throw new InvalidWorkflowError(`Invalid workflowId or repo: ${workflowId} / ${repo}`);
    }
    try {
        await (0, create_1.createWorkflow)(options);
    }
    catch (error) {
        (0, utils_1.doDebug)(options, '[triggerWorkflow > createWorkflow]', error);
        throw new TriggerWorkflowError(`Failed to trigger workflow: ${(0, utils_1.errorMessage)(error)}`, { cause: error });
    }
    try {
        return (0, list_runs_1.lastUncompletedRun)(options);
    }
    catch (error) {
        (0, utils_1.doDebug)(options, '[triggerWorkflow > determineWorkflowRunId]', error);
        throw new TriggerWorkflowError(`Failed to read workflow id: ${(0, utils_1.errorMessage)(error)}`, { cause: error });
    }
}
exports.triggerWorkflow = triggerWorkflow;
