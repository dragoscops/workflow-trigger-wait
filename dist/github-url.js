"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubUrl = void 0;
let instance;
class GithubUrl {
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
exports.GithubUrl = GithubUrl;
