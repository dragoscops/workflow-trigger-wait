import axios from 'axios';
import * as MockAdapter from 'axios-mock-adapter';
import {triggerWorkflow, TriggerWorkflowError, Options} from './index'; // Adjust the path to your project structure

describe('GitHub Action Tests (no_throw branch)', () => {
  let mock: MockAdapter;

  const defaultOptions: Options = {
    githubToken: 'fake-token',
    repo: 'owner/repo',
    workflowId: 'workflow.yml',
    ref: 'main',
    inputs: {key: 'value'},
    waitInterval: 10000,
    timeout: 60000,
    action: 'trigger-and-wait',
    noThrow: 'false',
    runId: '',
  };

  beforeEach(() => {
    mock = new MockAdapter(axios); // Initialize the Axios mock adapter
  });

  afterEach(() => {
    mock.restore(); // Clean up the mock after each test
  });

  describe('triggerWorkflow', () => {
    it('should successfully trigger a workflow', async () => {
      const triggerWorkflowUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/workflows/${defaultOptions.workflowId}/dispatches`;

      // Mock the POST request to simulate a successful workflow trigger
      mock.onPost(triggerWorkflowUrl).reply(204);

      await expect(triggerWorkflow(defaultOptions)).resolves.toBe('');
      expect(mock.history.post.length).toBe(1); // Ensure the POST request was made
    });

    it('should throw an error when triggering the workflow fails and noThrow is false', async () => {
      const triggerWorkflowUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/workflows/${defaultOptions.workflowId}/dispatches`;

      // Mock the POST request to return an error
      mock.onPost(triggerWorkflowUrl).reply(500, {message: 'Internal Server Error'});

      await expect(triggerWorkflow(defaultOptions)).rejects.toThrow(TriggerWorkflowError);
    });

    it('should not throw an error when triggering fails and noThrow is true', async () => {
      const options = {...defaultOptions, noThrow: 'true'};
      const triggerWorkflowUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/workflows/${defaultOptions.workflowId}/dispatches`;

      // Mock the POST request to return an error
      mock.onPost(triggerWorkflowUrl).reply(500, {message: 'Internal Server Error'});

      await expect(triggerWorkflow(options)).resolves.toBe('');
    });
  });

  // describe('determineWorkflowRunId', () => {
  //   it('should return the workflow run ID if found', async () => {
  //     const workflowRunUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/runs`;
  //     mock.onGet(workflowRunUrl).reply(200, {
  //       workflow_runs: [
  //         {
  //           id: 12345,
  //           head_branch: 'main',
  //           status: 'queued',
  //           path: 'workflow.yml',
  //         },
  //       ],
  //     });

  //     const runId = await determineWorkflowRunId(defaultOptions);
  //     expect(runId).toBe('12345');
  //   });

  //   it('should return an empty string if no matching workflow run is found', async () => {
  //     const workflowRunUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/runs`;
  //     mock.onGet(workflowRunUrl).reply(200, {workflow_runs: []});

  //     const runId = await determineWorkflowRunId(defaultOptions);
  //     expect(runId).toBe('');
  //   });
  // });

  // describe('waitForWorkflow', () => {
  //   it('should resolve when the workflow completes successfully', async () => {
  //     const statusUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/runs/12345`;
  //     mock
  //       .onGet(statusUrl)
  //       .replyOnce(200, {status: 'in_progress'})
  //       .onGet(statusUrl)
  //       .replyOnce(200, {status: 'completed', conclusion: 'success'});

  //     await expect(waitForWorkflow({...defaultOptions, runId: '12345'})).resolves.toBeUndefined();
  //   });

  //   it('should throw an error if the workflow fails', async () => {
  //     const statusUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/runs/12345`;
  //     mock
  //       .onGet(statusUrl)
  //       .replyOnce(200, {status: 'in_progress'})
  //       .onGet(statusUrl)
  //       .replyOnce(200, {status: 'completed', conclusion: 'failure'});

  //     await expect(waitForWorkflow({...defaultOptions, runId: '12345'})).rejects.toThrow(
  //       'Workflow run 12345 failed with conclusion: failure',
  //     );
  //   });

  //   it('should handle timeout if the workflow does not complete in time', async () => {
  //     const statusUrl = `https://api.github.com/repos/${defaultOptions.repo}/actions/runs/12345`;
  //     mock.onGet(statusUrl).reply(200, {status: 'in_progress'});

  //     await expect(waitForWorkflow({...defaultOptions, runId: '12345', timeout: 1000})).rejects.toThrow(
  //       'Timeout waiting for workflow run 12345 to complete',
  //     );
  //   });
  // });
});
