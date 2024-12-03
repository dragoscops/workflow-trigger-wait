let instance;
export class GithubUrl {
    static getInstance() {
        if (!instance) {
            instance = new GithubUrl();
        }
        return instance;
    }
    root = 'https://github.com';
    workflowDetailsId({ repo, runId }) {
        return `${this.root}/${repo}/actions/runs/${runId}`;
    }
}
