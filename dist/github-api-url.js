"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubApiUrl = void 0;
let instance;
class GithubApiUrl {
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
exports.GithubApiUrl = GithubApiUrl;
