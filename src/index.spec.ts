/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */
import axios from 'axios';
import '@actions/core';
import * as MockAdapter from 'axios-mock-adapter';

import {
  ActionType,
  createWorkflow,
  determineWorkflowRunIdAttempt,
  determineWorkflowRunId,
  getWorkflowDispatchUrl,
  getRunsListUrl,
  Options,
  waitForWorkflow,
  getWorkflowRunStatusUrl,
  runAction,
} from './index'; // Adjust the path to your project structure

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

console.error = jest.fn();
console.log = jest.fn();
console.warn = jest.fn();

const triggerAndWaitAction: ActionType = 'trigger-and-wait';
const internalServerError = 'Internal Server Error';

describe('GitHub Action Tests', () => {
  let mock: MockAdapter;

  const defaultOptions: Options = {
    githubToken: 'fake-token',
    repo: 'owner/repo',
    workflowId: 'deploy.yml',
    ref: 'main',
    inputs: {key: 'value'},
    waitInterval: 500,
    timeout: 2000,
    action: triggerAndWaitAction,
    noThrow: 'false',
    runId: '',
    determineRunId: {
      pollingInterval: 500,
      maxPollingAttempts: 3,
    },
  };

  beforeEach(() => {
    mock = new MockAdapter(axios); // Initialize the Axios mock adapter
  });

  afterEach(() => {
    mock.restore(); // Clean up the mock after each test
  });

  describe('createWorkflow', () => {
    const mockWorkflowDispatchUrl = getWorkflowDispatchUrl(defaultOptions);

    it('should call the correct API endpoint with the correct payload', async () => {
      // Mock successful POST response
      mock.onPost(mockWorkflowDispatchUrl).reply(204);

      await expect(createWorkflow(defaultOptions)).resolves.toBeUndefined();

      // Verify that the correct request was made
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe(mockWorkflowDispatchUrl);
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        ref: defaultOptions.ref,
        inputs: defaultOptions.inputs,
      });
      expect(mock.history.post[0].headers).toMatchObject({
        Authorization: `Bearer ${defaultOptions.githubToken}`,
        Accept: 'application/vnd.github+json',
      });
    });

    it('should throw an error if the response status is not 204', async () => {
      // Mock failed POST response
      mock.onPost(mockWorkflowDispatchUrl).reply(400, {message: 'Bad Request'});

      await expect(createWorkflow(defaultOptions)).rejects.toThrow(
        'Failed to trigger workflow: Request failed with status code 400',
      );
    });

    it('should throw an error if the request fails', async () => {
      // Mock network error
      mock.onPost(mockWorkflowDispatchUrl).networkError();

      await expect(createWorkflow(defaultOptions)).rejects.toThrow('Failed to trigger workflow: Network Error');
    });
  });

  describe('determineWorkflowRunIdAttempt', () => {
    const mockRunsListUrl = getRunsListUrl(defaultOptions);

    it('should return a matching workflow run ID', async () => {
      // Mock GET response with a matching workflow run
      mock.onGet(mockRunsListUrl).reply(200, {
        workflow_runs: [
          {
            id: 12345,
            head_branch: defaultOptions.ref,
            path: defaultOptions.workflowId,
            status: 'in_progress',
          },
        ],
      });

      const runId = await determineWorkflowRunIdAttempt(defaultOptions);
      expect(runId).toBe('12345');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });

    it('should return an empty string if no matching workflow run is found', async () => {
      // Mock GET response with no matching workflow runs
      mock.onGet(mockRunsListUrl).reply(200, {
        workflow_runs: [],
      });

      const runId = await determineWorkflowRunIdAttempt(defaultOptions);
      expect(runId).toBe('');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });

    it('should throw an error if the request fails', async () => {
      // Mock GET request failure
      mock.onGet(mockRunsListUrl).reply(500, {message: internalServerError});

      await expect(determineWorkflowRunIdAttempt(defaultOptions)).rejects.toThrow(
        'Request failed with status code 500',
      );
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });

    it('should throw an error if there is a network error', async () => {
      // Mock network error
      mock.onGet(mockRunsListUrl).networkError();

      await expect(determineWorkflowRunIdAttempt(defaultOptions)).rejects.toThrow('Network Error');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });
  });

  describe('determineWorkflowRunId', () => {
    const mockRunsListUrl = getRunsListUrl(defaultOptions);

    it('should return a workflow run ID if found within the timeout period', async () => {
      // First call: No matching workflow run
      mock.onGet(mockRunsListUrl).replyOnce(200, {
        workflow_runs: [],
      });

      // Second call: Matching workflow run found
      mock.onGet(mockRunsListUrl).replyOnce(200, {
        workflow_runs: [
          {
            id: 12345,
            head_branch: defaultOptions.ref,
            path: defaultOptions.workflowId,
            status: 'in_progress',
          },
        ],
      });

      const runId = await determineWorkflowRunId(defaultOptions);
      expect(runId).toBe('12345');
      expect(mock.history.get.length).toBe(2); // Ensure both GET requests were made
    });

    it('should throw an error if no workflow run ID is found within the timeout period', async () => {
      // Mock GET response with no matching workflow runs for all attempts
      mock.onGet(mockRunsListUrl).reply(200, {
        workflow_runs: [],
      });

      await expect(determineWorkflowRunId(defaultOptions)).rejects.toThrow(
        'Failed to get workflow run ID after multiple polling attempts',
      );
      expect(mock.history.get.length).toBeGreaterThan(1); // Ensure polling occurred
    });

    it('should throw an error if determineWorkflowRunIdAttempt fails', async () => {
      // Mock an error in one of the GET requests
      mock.onGet(mockRunsListUrl).reply(500, {message: internalServerError});

      await expect(determineWorkflowRunId(defaultOptions)).rejects.toThrow(
        'Failed to get workflow run ID: Request failed with status code 500',
      );
      expect(mock.history.get.length).toBe(1); // Ensure only one GET request was made before error
    });

    it('should respect the polling interval between attempts', async () => {
      // First call: No matching workflow run
      mock.onGet(mockRunsListUrl).replyOnce(200, {
        workflow_runs: [],
      });

      // Second call: Matching workflow run found
      mock.onGet(mockRunsListUrl).replyOnce(200, {
        workflow_runs: [
          {
            id: 12345,
            head_branch: defaultOptions.ref,
            path: defaultOptions.workflowId,
            status: 'in_progress',
          },
        ],
      });

      const startTime = Date.now();
      const runId = await determineWorkflowRunId(defaultOptions);
      const elapsedTime = Date.now() - startTime;
      const {pollingInterval} = defaultOptions.determineRunId!;

      expect(runId).toBe('12345');
      expect(elapsedTime).toBeGreaterThanOrEqual(pollingInterval!); // Ensure at least one polling interval
      expect(mock.history.get.length).toBe(2); // Ensure two GET requests were made
    });
  });

  describe('waitForWorkflow', () => {
    const options = {...defaultOptions, runId: '12345'};
    const mockRunStatusUrl = getWorkflowRunStatusUrl(options);

    it('should return successfully when the workflow completes with success', async () => {
      // First call: Workflow is in progress
      mock.onGet(mockRunStatusUrl).replyOnce(200, {
        status: 'in_progress',
      });

      // Second call: Workflow completes with success
      mock.onGet(mockRunStatusUrl).replyOnce(200, {
        status: 'completed',
        conclusion: 'success',
      });

      await expect(waitForWorkflow(options)).resolves.toBeUndefined();

      // Verify GET requests
      expect(mock.history.get.length).toBe(2); // Two polling attempts
      expect(mock.history.get[0].url).toBe(mockRunStatusUrl);
      expect(mock.history.get[1].url).toBe(mockRunStatusUrl);
    });

    it('should throw an error when the workflow completes with a failure', async () => {
      // Mock the workflow response indicating failure
      mock.onGet(mockRunStatusUrl).reply(200, {
        status: 'completed',
        conclusion: 'failure',
      });

      await expect(waitForWorkflow(options)).rejects.toThrow('Workflow run 12345 failed with conclusion: failure');

      // Verify GET request
      expect(mock.history.get.length).toBe(1); // Only one polling attempt
      expect(mock.history.get[0].url).toBe(mockRunStatusUrl);
    });

    it('should throw a timeout error if the workflow does not complete within the timeout period', async () => {
      // Mock the workflow response to stay in progress
      mock.onGet(mockRunStatusUrl).reply(200, {
        status: 'in_progress',
      });

      await expect(
        waitForWorkflow({...defaultOptions, runId: '12345', timeout: 1000, waitInterval: 500}),
      ).rejects.toThrow('Timeout waiting for workflow run 12345 to complete.');

      // Verify GET requests
      expect(mock.history.get.length).toBeGreaterThan(1); // Multiple polling attempts
      expect(mock.history.get[0].url).toBe(mockRunStatusUrl);
    });

    it('should throw an error if the request for workflow status fails', async () => {
      // Mock a failed GET request
      mock.onGet(mockRunStatusUrl).reply(500, {message: internalServerError});

      await expect(waitForWorkflow(options)).rejects.toThrow('Request failed with status code 500');

      //   // Verify GET request
      expect(mock.history.get.length).toBe(1); // Only one polling attempt
      expect(mock.history.get[0].url).toBe(mockRunStatusUrl);
    });

    it('should throw a network error if there is a network issue', async () => {
      // Mock a network error
      mock.onGet(mockRunStatusUrl).networkError();

      await expect(waitForWorkflow(options)).rejects.toThrow('Network Error');

      // Verify GET request
      expect(mock.history.get.length).toBe(1); // Only one polling attempt
      expect(mock.history.get[0].url).toBe(mockRunStatusUrl);
    });
  });

  describe('runAction', () => {
    it('should trigger a workflow and wait when action is "trigger-and-wait"', async () => {
      const options = {...defaultOptions, action: triggerAndWaitAction};
      const workflowDispatchUrl = getWorkflowDispatchUrl(options);
      const runStatusUrl = getWorkflowRunStatusUrl({...options, runId: '12345'});

      // Mock workflow trigger API
      mock.onPost(workflowDispatchUrl).reply(204);
      // Mock polling for workflow run ID
      mock.onGet(getRunsListUrl(options)).replyOnce(200, {workflow_runs: []}); // No run found
      mock.onGet(getRunsListUrl(options)).replyOnce(200, {
        workflow_runs: [{id: '12345', head_branch: options.ref, path: options.workflowId, status: 'in_progress'}],
      });
      // Mock polling for workflow completion
      mock.onGet(runStatusUrl).replyOnce(200, {status: 'in_progress'});
      mock.onGet(runStatusUrl).replyOnce(200, {status: 'completed', conclusion: 'success'});

      await expect(runAction(options)).resolves.toBeUndefined();

      // Verify the API calls
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe(workflowDispatchUrl);
      expect(mock.history.get.length).toBe(4); // Two for run ID + two for status
    });

    it('should only trigger a workflow when action is "trigger-only"', async () => {
      const options = {...defaultOptions, action: 'trigger-only'} as Options;
      const workflowDispatchUrl = getWorkflowDispatchUrl(options);
      const mockRunsListUrl = getRunsListUrl(options);

      // Mock workflow trigger API
      mock.onPost(workflowDispatchUrl).reply(204);
      // Mock polling for workflow run ID
      mock.onGet(mockRunsListUrl).replyOnce(200, {workflow_runs: []}); // No run found
      mock.onGet(mockRunsListUrl).replyOnce(200, {
        workflow_runs: [{id: '12345', head_branch: options.ref, path: options.workflowId, status: 'in_progress'}],
      });

      await expect(runAction(options)).resolves.toBeUndefined();

      // Verify the API call
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe(workflowDispatchUrl);
      expect(mock.history.get.length).toBe(2); // No GET requests
    });

    it('should only wait for a workflow when action is "wait-only"', async () => {
      const options = {...defaultOptions, action: 'wait-only', runId: '12345'} as Options;
      const runStatusUrl = getWorkflowRunStatusUrl(options);

      // Mock polling for workflow completion
      mock.onGet(runStatusUrl).replyOnce(200, {status: 'in_progress'});
      mock.onGet(runStatusUrl).replyOnce(200, {status: 'completed', conclusion: 'success'});

      await expect(runAction(options)).resolves.toBeUndefined();

      // Verify the API calls
      expect(mock.history.post.length).toBe(0); // No POST requests
      expect(mock.history.get.length).toBe(2); // Two polling attempts
      expect(mock.history.get[0].url).toBe(runStatusUrl);
    });

    it('should throw an InputError if action is "wait-only" but runId is missing', async () => {
      const options = {...defaultOptions, action: 'wait-only', runId: ''} as Options;

      await expect(runAction(options)).rejects.toThrow('run_id is required for action: wait-only');

      // Verify no API calls were made
      expect(mock.history.post.length).toBe(0);
      expect(mock.history.get.length).toBe(0);
    });

    it('should throw an InputError if action is invalid', async () => {
      const options = {...defaultOptions, action: 'invalid-action' as ActionType};

      await expect(runAction(options)).rejects.toThrow('Invalid action: invalid-action');

      // Verify no API calls were made
      expect(mock.history.post.length).toBe(0);
      expect(mock.history.get.length).toBe(0);
    });

    it('should throw an error if triggering the workflow fails', async () => {
      const options = {...defaultOptions, action: triggerAndWaitAction};
      const workflowDispatchUrl = getWorkflowDispatchUrl(options);

      // Mock failed POST response
      mock.onPost(workflowDispatchUrl).reply(500, {message: internalServerError});

      await expect(runAction(options)).rejects.toThrow(
        'Failed to trigger workflow: Request failed with status code 500',
      );

      // Verify the API call
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe(workflowDispatchUrl);
    });

    it('should throw an error if waiting for the workflow fails', async () => {
      const options = {...defaultOptions, action: triggerAndWaitAction};
      const workflowDispatchUrl = getWorkflowDispatchUrl(options);
      const runStatusUrl = getWorkflowRunStatusUrl({...options, runId: '12345'});

      // Mock workflow trigger API
      mock.onPost(workflowDispatchUrl).reply(204);
      // Mock polling for workflow run ID
      mock.onGet(getRunsListUrl(options)).replyOnce(200, {
        workflow_runs: [{id: '12345', head_branch: options.ref, path: options.workflowId, status: 'in_progress'}],
      });
      // Mock polling for workflow completion with failure
      mock.onGet(runStatusUrl).replyOnce(200, {status: 'completed', conclusion: 'failure'});

      await expect(runAction(options)).rejects.toThrow('Workflow run 12345 failed with conclusion: failure');

      // Verify the API calls
      expect(mock.history.post.length).toBe(1); // One POST request
      expect(mock.history.get.length).toBe(2); // One GET for run ID, one for status
    });
  });
});
