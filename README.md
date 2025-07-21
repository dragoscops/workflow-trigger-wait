# GitHub Action: Workflow Trigger and Wait

[![Build Status](https://github.com/dragoscops/workflow-trigger-wait/actions/workflows/ci.yml/badge.svg)](https://github.com/dragoscops/workflow-trigger-wait/actions/workflows/ci.yml)

This Github action facilitates triggering workflows (in a different or the same repository) and optionally waiting for them to complete. It's designed to streamline the coordination of workflows across multiple repositories, enhancing automation and efficiency in your development processes.

- [GitHub Action: Workflow Trigger and Wait](#github-action-workflow-trigger-and-wait)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Usage](#usage)
    - [Inputs](#inputs)
      - [Credentials](#credentials)
        - [Credentials: GitHub App](#credentials-github-app)
    - [Outputs](#outputs)
  - [Example Workflows](#example-workflows)
    - [Trigger and Wait](#trigger-and-wait)
    - [Trigger with `run_pattern`](#trigger-with-run_pattern)
    - [Trigger Using GitHub App](#trigger-using-github-app)
      - [Using `privateKey`:](#using-privatekey)
      - [Using `GH_APP_PRIVATE_KEY` Environment Variable:](#using-gh_app_private_key-environment-variable)
    - [Trigger and Perform Additional Actions Before Waiting](#trigger-and-perform-additional-actions-before-waiting)
  - [Modes of Operation](#modes-of-operation)
  - [Development](#development)
    - [Running Tests](#running-tests)
    - [Building](#building)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- **Trigger Workflows:** Initiate workflows in a target repository seamlessly.
- **Wait for Completion:** Optionally wait for workflows to complete with customizable polling intervals and timeouts.
- **Enhanced GitHub App Authentication:** Multiple workarounds for the JSON/PEM incompatibility issue - supports base64-encoded keys and environment variables.
- **Flexible Modes of Operation:**
  - `trigger-and-wait` (default): Triggers the workflow and waits for it to complete.
  - `trigger-only`: Triggers the workflow without waiting for its completion.
  - `wait-only`: Waits for the completion of a specific workflow using its `run_id`.
- **Filter Runs by Pattern:** Use `run_pattern` to filter workflow runs based on the run name using string matching or regular expressions.
- **Configurable Inputs:** Dynamic inputs allow for customizable and flexible behavior.
- **Robust Error Handling:**
  - Use `no_throw` to suppress errors and capture them in outputs.
- **Debugging Support:** Provides detailed logs when debug mode is enabled for easier troubleshooting.

## Prerequisites

- **GitHub Token:** A GitHub token with appropriate permissions to trigger and monitor workflows in the target repository.
- **GitHub App Credentials (Optional):** If using a GitHub App for authentication, ensure you have the `appId`, `privateKey`.

> [!IMPORTANT]
> In case you wish to use a GitHub App token for authentication, there is no limitation to the token. However, remember that 
> *an installation access token expires after 1 hour*. To benefit from the capability to use a token refresh mechanism for 
> authentication, use our `app` configuration for authentication. The `app` configuration allows this GitHub Action to mimic 
> [create-github-app-token](https://github.com/actions/create-github-app-token), generating a GitHub app token. However, it 
> makes sure the token is refreshed/re-generated when it is close to expiring.

> [!IMPORTANT]
> It is not recommended to trigger multiple workflows of the same type unless you use the `run_pattern` input for detection. 
> Triggering multiple workflows of the same type without the `run_pattern` may end up in returning the wrong run id which may 
> lead into false positives/negatives.

## Usage

### Inputs

| Name              | Required | Default             | Description                                                                                                                                                                                                                                          |
|-------------------|----------|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `credentials`     | **Yes**  | N/A                 | GitHub credentials provided as a JSON string. It can include a personal access token or GitHub App credentials.                                                                                                                                      |
| `repo`            | No       | N/A                 | Target repository in the format `owner/repo`.                                                                                                                                                                                                         |
| `workflow_id`     | No       | N/A                 | Workflow file name or ID to trigger (e.g., `workflow.yml` or its numeric ID).                                                                                                                                                                        |
| `ref`             | No       | `main`              | Git reference (branch, tag, or commit SHA) for the workflow run.                                                                                                                                                                                      |
| `inputs`          | No       | `{}`                | JSON string of inputs for the workflow.                                                                                                                                                                                                               |
| `wait_interval`   | No       | `10s`               | Interval between status checks (e.g., `30s`, `1m`).                                                                                                                                                                                                   |
| `timeout`         | No       | `1h`                | Maximum time to wait for workflow completion (e.g., `15m`, `2h`).                                                                                                                                                                                     |
| `action`          | No       | `trigger-and-wait`  | Mode of operation: `trigger-and-wait`, `trigger-only`, or `wait-only`.                                                                                                                                                                                |
| `run_id`          | No       | N/A                 | Workflow run ID (required for `wait-only` mode).                                                                                                                                                                                                      |
| `run_pattern`     | No       | N/A                 | Pattern to filter workflow runs by name when waiting for completion. Supports string matching and regular expressions.                                                                                                                                |
| `no_throw`        | No       | `false`             | Suppresses errors if set to `true` or `yes`, allowing the action to continue and capture errors in outputs instead of failing.                                                                                                                        |
| `debug`           | No       | `no`                | Enables debug logs if set to `true` or `yes`, providing more detailed information in the action logs for troubleshooting.                                                                                                                             |
| `app_id`          | No       | N/A                 | GitHub App ID for authentication. Required if using GitHub App credentials.                                                                                                                                                                           |
| `private_key`     | No       | N/A                 | Private key for GitHub App authentication. Can be provided as a PEM string joined by `\n` or via an environment variable (`GH_APP_PRIVATE_KEY`).                                                                                                       |
| `installation_id` | No       | N/A                 | Installation ID for the GitHub App. Required if not provided within the `credentials` JSON.                                                                                                                                                           |
| `owner`           | No       | N/A                 | Owner of the repository. If not provided, defaults to the owner extracted from the `GITHUB_REPOSITORY` environment variable.                                                                                                                          |
| `repositories`    | No       | N/A                 | List of repositories for the GitHub App. If not provided, defaults to the repository extracted from the `GITHUB_REPOSITORY` environment variable.                                                                                                     |

#### Credentials

| Name     | Required | Default | Description                              |
|----------|----------|---------|------------------------------------------|
| `token`  | No       | N/A     | GitHub Token with necessary permissions. |
| `app`    | No       | N/A     | GitHub App credentials as a nested JSON. |

> **Note**
> If `token` is not specified, the GitHub Action will look for `app`.

##### Credentials: GitHub App

| Name                | Required | Default                 | Description                                             |
|---------------------|----------|-------------------------|---------------------------------------------------------|
| `appId`             | **Yes**  | N/A                     | GitHub App ID                                           |
| `privateKey`        | No  | N/A                     | GitHub Base64 encoded App Private Key |
| `privateKeyEnvVarName` | No    | `GITHUB_APP_PRIVATE_KEY` | Environment variable name containing the raw PEM private key (used when `privateKey` is not provided as base64 encoded) |
| `installationId`    | No       | N/A                     | Installation ID for the GitHub App                      |
| `owner`             | No       | N/A                     | Owner of the GitHub App                                 |
| `repositories`      | No       | N/A                     | List of repositories the GitHub App has access to       |

> **Note**
> Since `credentials` is a JSON string, GitHub Actions private keys (which contain actual newlines) **cannot** be directly included in JSON. This action provides two workarounds:
> 
> 1. **Base64-encode the private key** - The action automatically detects and decodes base64-encoded keys
> 2. **Use environment variables** - Do not provide `privateKey` and store the raw PEM key in `GITHUB_APP_PRIVATE_KEY` environment variable (or mention the name of the environment variable under `privateKeyEnvVarName`)

- **Example 1: Base64-Encoded Private Key (Recommended)**

  First, encode your private key:
  ```bash
  base64 -i /path/to/your/private-key.pem | tr -d '\n'
  ```
  
  Then use it in your workflow:
  ```yaml
  - name: Trigger and Wait for Workflow
    uses: dragoscops/workflow-trigger-wait@v3.1
    with:
      credentials: |
        {
          "appId": "${{ vars.GH_APP_ID }}",
          "privateKey": "${{ secrets.GH_APP_PRIVATE_KEY_BASE64 }}",
          "owner": "dragoscops"
        }
      ...
  ```

- **Example 2: Using Environment Variable (Cleanest)**

  ```yaml
  - name: Trigger and Wait for Workflow
    uses: dragoscops/workflow-trigger-wait@v3.1
    with:
      credentials: |
        {
          "appId": "${{ vars.GH_APP_ID }}",
          "owner": "dragoscops"
        }
      ...
    env:
      GITHUB_APP_PRIVATE_KEY: ${{ secrets.GH_APP_PRIVATE_KEY_RAW }}
  ```

- **Example 3: Custom Environment Variable Name**

  ```yaml
  - name: Trigger and Wait for Workflow
    uses: dragoscops/workflow-trigger-wait@v3.1
    with:
      credentials: |
        {
          "appId": "${{ vars.GH_APP_ID }}",
          "privateKeyEnvVarName": "MY_CUSTOM_PRIVATE_KEY",
          "owner": "dragoscops"
        }
      ...
    env:
      MY_CUSTOM_PRIVATE_KEY: ${{ secrets.MY_CUSTOM_PRIVATE_KEY }}
  ```

If `installationId` is not specified, the action will look for `owner`. If `owner` is not specified, the action will extract it from the `GITHUB_REPOSITORY` environment variable. Similarly, if `repositories` is not mentioned, it will default to the repository extracted from the `GITHUB_REPOSITORY` environment variable.

Ensure that sensitive information such as `token`, `appId`, `privateKey`, and `installationId` are securely stored as [secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) in your GitHub repository.

### Outputs

| Name             | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `run_id`         | The workflow run ID of the triggered workflow.                              |
| `run_url`        | The URL of the triggered workflow run.                                      |
| `run_conclusion` | The conclusion of the workflow run (`success`, `failure`, `timed_out`, etc.). |

## Example Workflows

### Trigger and Wait

Triggers a workflow in a target repository and waits for its completion.

```yaml
name: Trigger and Wait for Workflow

on:
  workflow_dispatch:

jobs:
  trigger-and-wait:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger and Wait for Workflow
        uses: dragoscops/workflow-trigger-wait@v3.1
        with:
          credentials: |
            {
              "token": "${{ secrets.GH_TOKEN }}"
            }
          repo: "owner/target-repo"
          workflow_id: "workflow.yml"
          ref: "main"
          inputs: '{"key": "value"}'
          wait_interval: "30s"
          timeout: "15m"
          action: "trigger-and-wait"
```

### Trigger with `run_pattern`

Triggers a workflow and waits for the completion of a specific run matching the `run_pattern`.

```yaml
name: Trigger and Wait for Specific Workflow Run

on:
  workflow_dispatch:

jobs:
  trigger-and-wait:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger and Wait for Workflow Run Matching Pattern
        uses: dragoscops/workflow-trigger-wait@v3.1
        with:
          credentials: |
            {
              "token": "${{ secrets.GH_TOKEN }}"
            }
          repo: "owner/target-repo"
          workflow_id: "workflow.yml"
          ref: "main"
          inputs: '{"key": "value"}'
          run_pattern: "^Deploy to Production$"
          wait_interval: "30s"
          timeout: "15m"
          action: "trigger-and-wait"
```

In this example, the action will trigger the specified workflow and wait for a workflow run whose name matches the regular expression `^Deploy to Production$`.

```yaml
name: Target Workflow
run-name: 'Deploying to ${{ inputs.environment }}'

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Production  # This run-name matches the pattern "^Deploy to Production$"
    steps:
      - name: Deploy
        run: echo "Deploying to ${{ inputs.environment }}"
```

### Trigger Using GitHub App

#### Using `privateKey`:

Provides the GitHub App's private key directly within the `credentials` JSON.

```yaml
- name: Trigger and Wait for Workflow
  uses: dragoscops/workflow-trigger-wait@v3.1
  with:
    credentials: |
      {
        "appId": "${{ vars.GH_APP_ID }}",
        "privateKey": "${{ secrets.GH_APP_PRIVATE_KEY }}",
        "owner": "dragoscops"
      }
    repo: "owner/target-repo"
    workflow_id: "workflow.yml"
    ref: "main"
    inputs: '{"key": "value"}'
    wait_interval: "30s"
    timeout: "15m"
    action: "trigger-and-wait"
```

#### Using `GH_APP_PRIVATE_KEY` Environment Variable:

Stores the GitHub App's private key securely as an environment variable and references it in the `credentials` JSON.

```yaml
- name: Trigger and Wait for Workflow
  uses: dragoscops/workflow-trigger-wait@v3.1
  with:
    credentials: |
      {
        "appId": "${{ vars.GH_APP_ID }}",
        "owner": "dragoscops"
      }
    repo: "owner/target-repo"
    workflow_id: "workflow.yml"
    ref: "main"
    inputs: '{"key": "value"}'
    wait_interval: "30s"
    timeout: "15m"
    action: "trigger-and-wait"
  env:
    GH_APP_PRIVATE_KEY: |
      ${{ secrets.GH_APP_PRIVATE_KEY_RAW }}
```

### Trigger and Perform Additional Actions Before Waiting

Triggers a workflow without waiting for its completion and then performs additional actions before explicitly waiting for the workflow run to finish.

```yaml
name: Trigger and Wait with Other Steps

on:
  workflow_dispatch:

jobs:
  trigger-and-wait:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Workflow
        id: trigger
        uses: dragoscops/workflow-trigger-wait@v3.1
        with:
          credentials: |
            {
              "token": "${{ secrets.GH_TOKEN }}"
            }
          repo: "owner/target-repo"
          workflow_id: "workflow.yml"
          ref: "main"
          inputs: '{"param1": "value1"}'
          action: "trigger-only"

      # Additional actions can be performed here before waiting

      - name: Wait for Workflow Completion
        uses: dragoscops/workflow-trigger-wait@v3.1
        with:
          credentials: |
            {
              "token": "${{ secrets.GH_TOKEN }}"
            }
          repo: "owner/target-repo"
          run_id: ${{ steps.trigger.outputs.run_id }}
          action: "wait-only"
          run_pattern: "Deploy to Production"
          wait_interval: "15s"
          timeout: "20m"
```

In the above example, `run_pattern` can be used in the `wait-only` action to wait for a specific run matching the pattern.

## Modes of Operation

1. **`trigger-and-wait` (default):** Triggers the workflow and waits for it to complete.
2. **`trigger-only`:** Only triggers the workflow without waiting for its completion.
3. **`wait-only`:** Waits for a specific workflow to complete. Requires a `run_id` or can use `run_pattern` to identify the run.

Choose the appropriate mode based on your workflow coordination needs.

## Development

### Running Tests

Ensure that you have [Node.js](https://nodejs.org/) installed. Then, install dependencies and run tests using the following commands:

```bash
npm install
npm test
```

### Building

To build the action for distribution or deployment, use:

```bash
npm run build
```

Ensure that your `package.json` includes the necessary build scripts and dependencies.

## Contributing

Contributions are welcome! Whether it's reporting bugs, suggesting features, or submitting pull requests, your input helps improve the action.

1. **Fork the Repository:** Click the [Fork](https://github.com/dragoscops/workflow-trigger-wait/fork) button on the repository page.
2. **Clone Your Fork:**  
   ```bash
   git clone https://github.com/your-username/workflow-trigger-wait.git
   ```
3. **Create a Branch:**  
   ```bash
   git checkout -b feature/YourFeatureName
   ```
4. **Commit Your Changes:**  
   ```bash
   git commit -m "Add Your Feature"
   ```
5. **Push to Your Fork:**  
   ```bash
   git push origin feature/YourFeatureName
   ```
6. **Submit a Pull Request:** Navigate to the original repository and click on `Compare & pull request`.

Please ensure your contributions adhere to the project's coding standards and include appropriate tests where necessary.

## License

This project is licensed under the [MIT License](LICENSE).
