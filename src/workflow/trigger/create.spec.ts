/* eslint-disable max-lines-per-function */
import '@actions/core';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import {createWorkflow} from './create';
import {GithubApiUrl} from '../../github-api-url';
import {defaultOptions} from '../../options';

describe('createWorkflow', () => {
  let mock: MockAdapter;
  const mockWorkflowDispatchUrl = GithubApiUrl.getInstance().workflowDispatch(defaultOptions);

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should call the correct API endpoint with the correct payload', async () => {
    mock.onPost(mockWorkflowDispatchUrl).reply(204);

    await expect(createWorkflow(defaultOptions)).resolves.toBeUndefined();

    expect(mock.history.post.length).toBe(1);
    expect(mock.history.post[0].url).toBe(mockWorkflowDispatchUrl);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      ref: defaultOptions.ref,
      inputs: defaultOptions.inputs,
    });
    expect(mock.history.post[0].headers).toMatchObject({
      Authorization: `Bearer ${defaultOptions.credentials.token}`,
      Accept: 'application/vnd.github+json',
    });
  });

  it('should throw an error if the response status is not 204', async () => {
    mock.onPost(mockWorkflowDispatchUrl).reply(400, {message: 'Bad Request'});

    await expect(createWorkflow(defaultOptions)).rejects.toThrow(
      'Failed to trigger workflow: Request failed with status code 400',
    );
  });

  it('should throw an error if the request fails', async () => {
    mock.onPost(mockWorkflowDispatchUrl).networkError();

    await expect(createWorkflow(defaultOptions)).rejects.toThrow('Failed to trigger workflow: Network Error');
  });
});
