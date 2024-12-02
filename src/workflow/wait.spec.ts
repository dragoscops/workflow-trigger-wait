/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {waitForWorkflow} from './wait';
import {GithubApiUrl} from '../github-api-url';
import {defaultOptions} from '../options';

describe('waitForWorkflow', () => {
  let mock: MockAdapter;
  const options = {...defaultOptions, runId: '12345'};
  const mockRunStatusUrl = GithubApiUrl.getInstance().workflowRunStatus(options);

  beforeEach(() => {
    mock = new MockAdapter(axios); // Initialize the Axios mock adapter
  });

  afterEach(() => {
    mock.restore(); // Clean up the mock after each test
  });

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
    mock.onGet(mockRunStatusUrl).reply(500, {message: 'Internal Server Error'});

    await expect(waitForWorkflow(options)).rejects.toThrow('Request failed with status code 500');

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
