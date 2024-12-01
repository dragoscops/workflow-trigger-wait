import {Options} from './options';

let instance: GithubUrl;

export class GithubUrl {
  static getInstance() {
    if (!instance) {
      instance = new GithubUrl();
    }
    return instance;
  }

  readonly root = 'https://github.com';

  workflowDetailsId({repo, runId}: Options): string {
    return `${this.root}/${repo}/actions/runs/${runId}`;
  }
}
