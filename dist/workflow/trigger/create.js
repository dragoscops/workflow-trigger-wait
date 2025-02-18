import * as core from '@actions/core';
import { GithubApiUrl } from '../../github/api-url.js';
import { GithubAxios } from '../../github/axios.js';
import { doDebug } from '../../options.js';
import { errorMessage, GenericError } from '../../utils.js';
export class CreateWorkflowError extends GenericError {
    runConclusion = 'workflow_failed';
}
export async function createWorkflow(options) {
    const { ref, inputs } = options;
    const workflowUrl = GithubApiUrl.getInstance().workflowDispatch(options);
    core.info(`Calling ${workflowUrl}@${ref}`);
    try {
        const client = await GithubAxios.instance(options).create();
        doDebug(options, '[createWorkflow > GithubAxios.instance(...).create()]', client);
        const response = await client.post(workflowUrl, {
            ref,
            inputs,
        });
        doDebug(options, '[createWorkflow > client.post]', workflowUrl, response);
        if (response.status !== 204) {
            throw new Error(response.statusText);
        }
    }
    catch (error) {
        doDebug(options, '[createWorkflow > client.post]', workflowUrl, error);
        throw new Error(`Failed to trigger workflow: ${errorMessage(error)}`);
    }
    core.info(`Called ${workflowUrl}@${ref}`);
}
//# sourceMappingURL=create.js.map