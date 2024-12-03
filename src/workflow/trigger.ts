import {createWorkflow} from './trigger/create.js';
import {lastUncompletedRun} from './trigger/list-runs.js';
import {Options} from '../options.js';
import {doDebug, errorMessage, GenericError} from '../utils.js';

export class InvalidWorkflowError extends GenericError {
  runConclusion = 'invalid_workflow';
}

export class TriggerWorkflowError extends GenericError {
  runConclusion = 'trigger_failed';
}

export async function triggerWorkflow(options: Options): Promise<string> {
  const {repo, workflowId} = options;
  if (!workflowId || !repo) {
    throw new InvalidWorkflowError(`Invalid workflowId or repo: ${workflowId} / ${repo}`);
  }

  try {
    await createWorkflow(options);
  } catch (error) {
    doDebug(options, '[triggerWorkflow > createWorkflow]', error);
    throw new TriggerWorkflowError(`Failed to trigger workflow: ${errorMessage(error)}`, {cause: error});
  }

  // Since GitHub's API for dispatching a workflow does not return run_id, this part will need to be adjusted.
  // Here, we're assuming a way to obtain the run_id after triggering, which needs actual implementation.
  try {
    return lastUncompletedRun(options);
  } catch (error) {
    doDebug(options, '[triggerWorkflow > determineWorkflowRunId]', error);
    throw new TriggerWorkflowError(`Failed to read workflow id: ${errorMessage(error)}`, {cause: error});
  }
}
