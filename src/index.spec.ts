/* eslint-disable sonarjs/no-duplicate-string, max-lines-per-function */
import * as core from '@actions/core';
import axios from 'axios';
import * as MockAdapter from 'axios-mock-adapter';
import run, {
  createWorkflow,
  waitForWorkflow,
  getTriggerWorkflowUrl,
  getWorkflowRunIdUrl,
  getWorkflowStatusUrl,
} from './index';

// Mock the necessary parts of '@actions/core'
jest.mock('@actions/core');
const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
const mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;
const mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
const mockInfo = core.info as jest.MockedFunction<typeof core.info>;

const githubTokenMock = 'fake-token';
const refMock = 'main';
const repoMock = 'owner/repo';
const repoTupleMock = repoMock.split('/') as [string, string];
const workflowIdMock = 'workflow.yml';
const runIdMock = '5678';

const triggerWorkflowUrl = getTriggerWorkflowUrl(...repoTupleMock, workflowIdMock);
const workflowRunIdUrl = getWorkflowRunIdUrl(...repoTupleMock);
const workflowStatusUrl = getWorkflowStatusUrl(...repoTupleMock, 5678);

const mockInput = (action = 'trigger-and-wait') => {
  mockGetInput.mockImplementation((name: string) => {
    switch (name) {
      case 'github_token':
        return githubTokenMock;
      case 'repo':
        return repoMock;
      case 'workflow_id':
        return workflowIdMock;
      case 'ref':
        return refMock;
      case 'inputs':
        return '{}';
      case 'wait_interval':
        return '10s';
      case 'timeout':
        return '1h';
      case 'action':
        return action;
      case 'run_id':
        return runIdMock;
      default:
        return '';
    }
  });
};

describe('GitHub Action', () => {
  let axiosMock: MockAdapter;

  beforeEach(() => {
    axiosMock = new MockAdapter(axios);
    jest.resetAllMocks();
  });

  afterEach(() => {
    axiosMock.restore();
  });

  describe('successful triggers', () => {
    beforeEach(() => {
      axiosMock.onPost(triggerWorkflowUrl).reply(204);
      axiosMock.onGet(workflowRunIdUrl).reply(200, {
        workflow_runs: [
          {id: runIdMock, status: 'in_progress', path: `.github/workflows/${workflowIdMock}`, head_branch: refMock},
        ],
      });
      // Mock GitHub API responses
      axiosMock.onGet(workflowStatusUrl).reply(200, {
        status: 'completed',
        conclusion: 'success',
      });

      mockInput();
    });

    it('triggerWorkflow(...) should trigger the workflow', async () => {
      const runId = await createWorkflow({
        repo: repoMock,
        workflowId: workflowIdMock,
        ref: refMock,
        inputs: {},
        githubToken: githubTokenMock,
      });

      expect(runId).toEqual(runIdMock);
      expect(mockSetOutput).toHaveBeenCalledWith('run_id', runIdMock);
    });

    it('waitForWorkflow(...) should wait for the workflow to complete', async () => {
      await waitForWorkflow(repoMock, parseInt(runIdMock), 10000, 100000, githubTokenMock, '');

      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('run(trigger-and-wait) should trigger and wait the for the workflow', async () => {
      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();

      expect(mockSetOutput).toHaveBeenCalledWith('run_id', runIdMock);

      expect(mockInfo).toHaveBeenCalledWith(`Workflow run ${runIdMock} completed successfully.`);
    });

    it('run(trigger-only) should only trigger the workflow', async () => {
      mockInput('trigger-only');
      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();

      expect(mockSetOutput).toHaveBeenCalledWith('run_id', runIdMock);

      expect(mockInfo).not.toHaveBeenCalledWith(`Workflow run ${runIdMock} completed successfully.`);
    });

    it('run(wait-only) should only wait for the workflow', async () => {
      mockInput('wait-only');
      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();

      expect(mockSetOutput).not.toHaveBeenCalledWith('run_id', runIdMock);

      expect(mockInfo).toHaveBeenCalledWith(`Workflow run ${runIdMock} completed successfully.`);
    });
  });

  // it('should timeout while waiting for the workflow', async () => {
  //   // Mock GitHub API responses
  //   axiosMock.onGet(workflowStatusUrl).reply(200, {
  //     status: 'in_progress',
  //   });

  //   await expect(waitForWorkflow(repoMock, 5678, 1000, 3000, githubTokenMock)).rejects.toThrow(
  //     'Timeout waiting for workflow run 5678 to complete.',
  //   );

  //   // expect(mockSetFailed).toHaveBeenCalledWith(
  //   //   'Action failed with error: Timeout waiting for workflow run 5678 to complete.',
  //   // );
  // });

  // it('should fail if the workflow fails', async () => {
  //   const workflowStatusUrl = getWorkflowStatusUrl('owner', 'repo', 5678);

  //   // Mock GitHub API responses
  //   axiosMock.onGet(workflowStatusUrl).reply(200, {
  //     status: 'completed',
  //     conclusion: 'failure',
  //   });

  //   await expect(waitForWorkflow(repoMock, 5678, 1000, 10000, githubTokenMock)).rejects.toThrow(
  //     'Workflow run 5678 failed with conclusion: failure',
  //   );

  //   // expect(mockSetFailed).toHaveBeenCalledWith(
  //   //   'Action failed with error: Workflow run 5678 failed with conclusion: failure',
  //   // );
  // });
});
