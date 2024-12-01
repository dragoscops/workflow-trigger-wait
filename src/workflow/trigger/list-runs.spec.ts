/* eslint-disable max-len */
/* eslint-disable max-lines-per-function */
import axios from 'axios';
import '@actions/core';
import * as MockAdapter from 'axios-mock-adapter';

import {lastUncompletedRunAttempt, lastUncompletedRun} from './list-runs';
import {defaultOptions} from '../../options';
import {GithubApiUrl} from '../../github-api-url';

const internalServerError = 'Internal Server Error';

describe('list-runs', () => {
  let mock: MockAdapter;

  const mockRunsListUrl = GithubApiUrl.getInstance().runsList(defaultOptions);

  beforeEach(() => {
    mock = new MockAdapter(axios); // Initialize the Axios mock adapter
  });

  afterEach(() => {
    mock.restore(); // Clean up the mock after each test
  });

  describe('lastUncompletedRunAttempt', () => {
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

      const runId = await lastUncompletedRunAttempt(defaultOptions);
      expect(runId).toBe('12345');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });

    it('should return an empty string if no matching workflow run is found', async () => {
      // Mock GET response with no matching workflow runs
      mock.onGet(mockRunsListUrl).reply(200, {
        workflow_runs: [],
      });

      const runId = await lastUncompletedRunAttempt(defaultOptions);
      expect(runId).toBe('');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });

    it('should throw an error if the request fails', async () => {
      // Mock GET request failure
      mock.onGet(mockRunsListUrl).reply(500, {message: internalServerError});

      await expect(lastUncompletedRunAttempt(defaultOptions)).rejects.toThrow('Request failed with status code 500');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });

    it('should throw an error if there is a network error', async () => {
      // Mock network error
      mock.onGet(mockRunsListUrl).networkError();

      await expect(lastUncompletedRunAttempt(defaultOptions)).rejects.toThrow('Network Error');
      expect(mock.history.get.length).toBe(1); // Ensure the GET request was made
      expect(mock.history.get[0].url).toBe(mockRunsListUrl);
    });
  });

  describe('lastUncompletedRun', () => {
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

      const runId = await lastUncompletedRun(defaultOptions);
      expect(runId).toBe('12345');
      expect(mock.history.get.length).toBe(2); // Ensure both GET requests were made
    });

    it('should throw an error if no workflow run ID is found within the timeout period', async () => {
      // Mock GET response with no matching workflow runs for all attempts
      mock.onGet(mockRunsListUrl).reply(200, {
        workflow_runs: [],
      });

      await expect(lastUncompletedRun(defaultOptions)).rejects.toThrow(
        'Failed to get workflow run ID after multiple polling attempts',
      );
      expect(mock.history.get.length).toBeGreaterThan(1); // Ensure polling occurred
    });

    it('should throw an error if lastUncompletedRunAttempt fails', async () => {
      // Mock an error in one of the GET requests
      mock.onGet(mockRunsListUrl).reply(500, {message: internalServerError});

      await expect(lastUncompletedRun(defaultOptions)).rejects.toThrow(
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
      const runId = await lastUncompletedRun(defaultOptions);
      const elapsedTime = Date.now() - startTime;
      const {pollingInterval} = defaultOptions.determineRunId!;

      expect(runId).toBe('12345');
      expect(elapsedTime).toBeGreaterThanOrEqual(pollingInterval!); // Ensure at least one polling interval
      expect(mock.history.get.length).toBe(2); // Ensure two GET requests were made
    });
  });
});
