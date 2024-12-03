import * as core from '@actions/core';
import { processOptions } from './options.js';
import { doDebug, silentFail, errorMessage, GenericError, InputError } from './utils.js';
import { triggerWorkflow } from './workflow/trigger.js';
import { waitForWorkflow } from './workflow/wait.js';
export default async function run() {
    const options = processOptions();
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
export async function runAction(options) {
    const { action } = options;
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
