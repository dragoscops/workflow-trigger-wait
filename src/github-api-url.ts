import {Options} from './options';

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

  runsList({repo}: Options): string {
    return `/repos/${repo}/actions/runs`;
  }

  appGenerateInstallationAccessToken({credentials}: Options): string {
    return `/app/installations/${credentials.app!.installationId}/access_tokens`;
  }
}
