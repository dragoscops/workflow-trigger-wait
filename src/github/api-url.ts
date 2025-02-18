import {Options} from '../options.js';

let instance: GithubApiUrl;

export class GithubApiUrl {
  static getInstance() {
    if (!instance) {
      instance = new GithubApiUrl();
    }
    return instance;
  }

  readonly root = 'https://api.github.com';

  workflowDispatch({repo, workflowId}: Options): string {
    return `/repos/${repo}/actions/workflows/${workflowId}/dispatches`;
  }

  workflowRunStatus({repo, runId}: Options): string {
    return `/repos/${repo}/actions/runs/${runId}`;
  }

  runsList({repo, workflowId}: Options): string {
    return `/repos/${repo}/actions/workflows/${workflowId}/runs`;
  }

  runDetails({repo}: Options, runId: number): string {
    return `/repos/${repo}/actions/runs/${runId}`;
  }
}
