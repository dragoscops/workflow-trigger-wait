/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */
/* eslint-disable vitest/no-commented-out-tests */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GithubApiUrl } from './github/api-url.js';
import { actionTriggerAndWait, defaultOptions, Options } from './options.js';
import { runAction } from './run.js';

// const internalServerError = 'Internal Server Error';

describe('runAction', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios); // Initialize the Axios mock adapter
  });

  afterEach(() => {
    mock.restore(); // Clean up the mock after each test
  });

  const githubApiUrl = GithubApiUrl.getInstance();

  it(`should trigger a workflow and wait when action is ${actionTriggerAndWait}`, async () => {
    const options = { ...defaultOptions, action: actionTriggerAndWait } as Options;
    const workflowDispatchUrl = githubApiUrl.workflowDispatch(options);
    const runStatusUrl = githubApiUrl.workflowRunStatus({ ...options, runId: '12345' });
    const runListUrl = githubApiUrl.runsList(options);

    // Mock workflow trigger API
    mock.onPost(workflowDispatchUrl).reply(204);
    // Mock polling for workflow run ID
    mock.onGet(runListUrl).replyOnce(200, { workflow_runs: [] }); // No run found
    mock.onGet(runListUrl).replyOnce(200, {
      workflow_runs: [
        {
          id: '12345',
          head_branch: options.ref,
          path: options.workflowId,
          status: 'in_progress',
          config: {
            data: JSON.stringify({ ref: options.ref, inputs: options.inputs }),
          },
        },
      ],
    });
    // Mock polling for workflow completion
    mock.onGet(runStatusUrl).replyOnce(200, { status: 'in_progress' });
    mock.onGet(runStatusUrl).replyOnce(200, { status: 'completed', conclusion: 'success' });

    await expect(runAction(options)).resolves.toBeUndefined();

    // Verify the API calls
    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].url).toBe(workflowDispatchUrl);
    expect(mock.history.get.length).toBe(4); // Two for run ID + two for status
  });

  // it('should only trigger a workflow when action is "trigger-only"', async () => {
  //   const options = {...defaultOptions, action: 'trigger-only'} as Options;
  //   const workflowDispatchUrl = getWorkflowDispatchUrl(options);
  //   const mockRunsListUrl = getRunsListUrl(options);

  //   // Mock workflow trigger API
  //   mock.onPost(workflowDispatchUrl).reply(204);
  //   // Mock polling for workflow run ID
  //   mock.onGet(mockRunsListUrl).replyOnce(200, {workflow_runs: []}); // No run found
  //   mock.onGet(mockRunsListUrl).replyOnce(200, {
  //     workflow_runs: [{id: '12345', head_branch: options.ref, path: options.workflowId, status: 'in_progress'}],
  //   });

  //   await expect(runAction(options)).resolves.toBeUndefined();

  //   // Verify the API call
  //   expect(mock.history.post.length).toBe(1);
  //   expect(mock.history.post[0].url).toBe(workflowDispatchUrl);
  //   expect(mock.history.get.length).toBe(2); // No GET requests
  // });

  // it('should only wait for a workflow when action is "wait-only"', async () => {
  //   const options = {...defaultOptions, action: 'wait-only', runId: '12345'} as Options;
  //   const runStatusUrl = getWorkflowRunStatusUrl(options);

  //   // Mock polling for workflow completion
  //   mock.onGet(runStatusUrl).replyOnce(200, {status: 'in_progress'});
  //   mock.onGet(runStatusUrl).replyOnce(200, {status: 'completed', conclusion: 'success'});

  //   await expect(runAction(options)).resolves.toBeUndefined();

  //   // Verify the API calls
  //   expect(mock.history.post.length).toBe(0); // No POST requests
  //   expect(mock.history.get.length).toBe(2); // Two polling attempts
  //   expect(mock.history.get[0].url).toBe(runStatusUrl);
  // });

  // it('should throw an InputError if action is "wait-only" but runId is missing', async () => {
  //   const options = {...defaultOptions, action: 'wait-only', runId: ''} as Options;

  //   await expect(runAction(options)).rejects.toThrow('run_id is required for action: wait-only');

  //   // Verify no API calls were made
  //   expect(mock.history.post.length).toBe(0);
  //   expect(mock.history.get.length).toBe(0);
  // });

  // it('should throw an InputError if action is invalid', async () => {
  //   const options = {...defaultOptions, action: 'invalid-action' as ActionType};

  //   await expect(runAction(options)).rejects.toThrow('Invalid action: invalid-action');

  //   // Verify no API calls were made
  //   expect(mock.history.post.length).toBe(0);
  //   expect(mock.history.get.length).toBe(0);
  // });

  // it('should throw an error if triggering the workflow fails', async () => {
  //   const options = {...defaultOptions, action: triggerAndWaitAction};
  //   const workflowDispatchUrl = getWorkflowDispatchUrl(options);

  //   // Mock failed POST response
  //   mock.onPost(workflowDispatchUrl).reply(500, {message: internalServerError});

  //   await expect(runAction(options)).rejects.toThrow(
  //     'Failed to trigger workflow: Request failed with status code 500',
  //   );

  //   // Verify the API call
  //   expect(mock.history.post.length).toBe(1);
  //   expect(mock.history.post[0].url).toBe(workflowDispatchUrl);
  // });

  // it('should throw an error if waiting for the workflow fails', async () => {
  //   const options = {...defaultOptions, action: triggerAndWaitAction};
  //   const workflowDispatchUrl = getWorkflowDispatchUrl(options);
  //   const runStatusUrl = getWorkflowRunStatusUrl({...options, runId: '12345'});

  //   // Mock workflow trigger API
  //   mock.onPost(workflowDispatchUrl).reply(204);
  //   // Mock polling for workflow run ID
  //   mock.onGet(GithubApiUrl.getInstance().runsList(options)).replyOnce(200, {
  //     workflow_runs: [{id: '12345', head_branch: options.ref, path: options.workflowId, status: 'in_progress'}],
  //   });
  //   // Mock polling for workflow completion with failure
  //   mock.onGet(runStatusUrl).replyOnce(200, {status: 'completed', conclusion: 'failure'});

  //   await expect(runAction(options)).rejects.toThrow('Workflow run 12345 failed with conclusion: failure');

  //   // Verify the API calls
  //   expect(mock.history.post.length).toBe(1); // One POST request
  //   expect(mock.history.get.length).toBe(2); // One GET for run ID, one for status
  // });
});
