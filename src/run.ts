import * as core from '@actions/core';
import {Options, processOptions} from './options';
import {silentFail, errorMessage, GenericError, InputError} from './utils';
import {triggerWorkflow} from './workflow/trigger';
import {waitForWorkflow} from './workflow/wait';

export default async function run(): Promise<void> {
  const options = processOptions();

  try {
    await runAction(options);
    core.setOutput('run_conclusion', 'success'); // Explicitly mark as successful
  } catch (err) {
    console.log(err);
    const conclusion = err instanceof GenericError ? err.runConclusion ?? 'unknown' : 'unknown';

    core.setOutput('run_conclusion', conclusion); // Always set the conclusion
    core.info(`Run Conclusion: ${conclusion}`);
    core.info(`Error: ${errorMessage(err)}`);
    if (silentFail(options.noThrow)) {
      core.warning('Silent fail enabled. Suppressing action failure.');
    } else {
      core.setFailed(`Action failed with error: ${errorMessage(err)}`);
    }
  }
}

export async function runAction(options: Options) {
  const {action} = options;
  console.log(options);

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
