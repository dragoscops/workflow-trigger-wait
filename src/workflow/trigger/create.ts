import * as core from '@actions/core';

import {GithubApiUrl} from '../../github-api-url.js';
import {createGithubClient} from '../../github-client.js';
import {Options} from '../../options.js';
import {doDebug, errorMessage, GenericError} from '../../utils.js';

export class CreateWorkflowError extends GenericError {
  runConclusion = 'workflow_failed';
}

export async function createWorkflow(options: Options): Promise<void> {
  const {ref, inputs, credentials} = options;
  const workflowUrl = GithubApiUrl.getInstance().workflowDispatch(options);

  core.info(`Calling ${workflowUrl}@${ref}`);
  try {
    const client = await createGithubClient(credentials);
    doDebug(options, '[createGithubClient]', client);
    const response = await client.post(workflowUrl, {
      ref,
      inputs,
    });
    doDebug(options, '[createWorkflow > axios.post]', workflowUrl, response);
    if (response.status !== 204) {
      throw new Error(response.statusText);
    }
  } catch (error) {
    doDebug(options, '[createWorkflow > axios.post]', workflowUrl, error);
    throw new Error(`Failed to trigger workflow: ${errorMessage(error)}`);
  }
  core.info(`Called ${workflowUrl}@${ref}`);
}
