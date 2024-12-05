let instance;
export class GithubApiUrl {
    static getInstance() {
        if (!instance) {
            instance = new GithubApiUrl();
        }
        return instance;
    }
    root = 'https://api.github.com';
    workflowDispatch({ repo, workflowId }) {
        return `/repos/${repo}/actions/workflows/${workflowId}/dispatches`;
    }
    workflowRunStatus({ repo, runId }) {
        return `/repos/${repo}/actions/runs/${runId}`;
    }
    runsList({ repo }) {
        return `/repos/${repo}/actions/runs`;
    }
}
//# sourceMappingURL=api-url.js.map