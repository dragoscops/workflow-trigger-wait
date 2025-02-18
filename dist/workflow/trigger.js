import { createWorkflow } from './trigger/create.js';
import { lastUncompletedRun } from './trigger/list-runs.js';
import { doDebug } from '../options.js';
import { errorMessage, GenericError } from '../utils.js';
export class InvalidWorkflowError extends GenericError {
    runConclusion = 'invalid_workflow';
}
export class TriggerWorkflowError extends GenericError {
    runConclusion = 'trigger_failed';
}
export async function triggerWorkflow(options) {
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
        return lastUncompletedRun(options);
    }
    catch (error) {
        doDebug(options, '[triggerWorkflow > lastUncompletedRun]', error);
        throw new TriggerWorkflowError(`Failed to read workflow id: ${errorMessage(error)}`, { cause: error });
    }
}
//# sourceMappingURL=trigger.js.map