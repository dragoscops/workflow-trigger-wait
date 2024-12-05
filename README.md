# GitHub Action: Workflow Trigger and Wait

This GitHub Action facilitates triggering workflows in a different repository and optionally waiting for them to complete. It's designed to streamline the coordination of workflows across multiple repositories.

## Features

- **Trigger Workflows:** Initiates workflows in a target repository.
- **Wait for Completion:** Optionally wait for workflows to complete with customizable polling intervals and timeouts.
- **Modes of Operation:**
  - `trigger-and-wait` (default): Triggers the workflow and waits for it to complete.
  - `trigger-only`: Triggers the workflow without waiting for it to complete.
  - `wait-only`: Waits for the completion of a specific workflow using its `run_id`.
- **Configurable Inputs:** Flexible inputs allow for dynamic and customizable behavior.
- **Error Handling:**
  - Use `no_throw` to suppress errors and capture them in outputs.
- **Debugging Support:** Provides detailed logs when debug mode is enabled.

---

## Usage

### Inputs

| Name             | Required | Default     | Description                                                                   |
|------------------|----------|-------------|-------------------------------------------------------------------------------|
| `credentials`    | **Yes**  | N/A         | [GitHub credentials](#credentials) provided as a JSON string.                 |
| `repo`           | No       | N/A         | Target repository in the format `owner/repo`.                                 |
| `workflow_id`    | No       | N/A         | Workflow file name or ID to trigger.                                          |
| `ref`            | No       | `main`      | Git reference (branch, tag, or commit SHA) for the workflow.                  |
| `inputs`         | No       | `{}`        | JSON string of inputs for the workflow.                                       |
| `wait_interval`  | No       | `10s`       | Interval between status checks (e.g., `30s`, `1m`).                           |
| `timeout`        | No       | `1h`        | Maximum time to wait for workflow completion (e.g., `15m`, `2h`).             |
| `action`         | No       | `trigger-and-wait` | Mode of operation: `trigger-and-wait`, `trigger-only`, or `wait-only`. |
| `run_id`         | No       | N/A         | Workflow run ID (required for `wait-only`).                                   |
| `no_throw`       | No       | `false`     | Suppresses errors if set to `true` or `yes`.                                  |
| `debug`          | No       | `no`        | Enables debug logs if set to `true` or `yes`.                                 |
| `app_id`         | No       | N/A         | GitHub App ID for authentication.                                             |
| `private_key`    | No       | N/A         | Private key for GitHub App authentication. Can be passed as a PEM string joined by `\n` or as an environment variable. |
| `installation_id`| No       | N/A         | Installation ID for the GitHub App.                                           |
| `owner`          | No       | N/A         | Owner of the repository.                                                      |
| `repositories`   | No       | N/A         | List of repositories for the GitHub App.                                      |

#### Credentials

| Name             | Required | Default     | Description                                        |
|------------------|----------|-------------|----------------------------------------------------|
| `token`          | No       | N/A         | Github Token.                                      |
| `app`            | No       | N/A         | [Github App Credentials](#credentials-github-app). |

##### Credentials: GitHub App

| Name             | Required | Default     | Description                                        |
|------------------|----------|-------------|----------------------------------------------------|
| `appId`          | **Yes**  | N/A         | Github App ID                                      |
| `privateKey`     | **Yes**  | N/A         | Github App Private Key                             |
| `installationId` | No       | N/A         | Installation ID                                    |
| `owner`          | No       | N/A         | Application Owner                                  |
| `repositories`   | No       | N/A         | Owner Repositories                                 |

Since `credentials` is a JSON, the `privateKey` can be provided as a PEM in raw format. Thus, we will join the PEM lines using `\\n` or provide a separate environment variable under `GH_APP_PRIVATE_KEY` name.

If `installationId` is not specified, the action will look for `owner`. If the `owner` is not specified, the action will look for `github.GH_REPOSITORY` environment variable and extract it from there.

If `repositories` is not mentioned, the same `github.GH_REPOSITORY` will provide this information as well.

Ensure that the `token`, `appId`, `privateKey`, and `installationId` are securely stored as secrets in your GitHub repository.

---

### Outputs

| Name              | Description                                    |
|-------------------|------------------------------------------------|
| `run_id`          | The workflow run ID.                          |
| `run_conclusion`  | The conclusion of the workflow run (`success`, `failure`, `timeout`, etc.). |

---

### Example Workflows

#### Trigger and Wait

```yaml
name: Trigger and Wait for Workflow

on:
  workflow_dispatch:

jobs:
  trigger-and-wait:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger and Wait for Workflow
        uses: dragoscops/workflow-trigger-wait@v3
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

#### Trigger using Github App

##### Using `privateKey`:

```yaml
- name: Trigger and Wait for Workflow
  uses: dragoscops/workflow-trigger-wait@v3
  with:
    credentials: |
      {
        "appId": "${{ vars.GH_APP_ID }}",
        "privateKey": "${{ secrets.GH_APP_PRIVATE_KEY }},
        "owner": "dragoscops"
      }
    ...
```

Normalizing the key for passing it to `privateKey`:

```javascript
console.log(require("fs").readFileSync("/path/to/key.pem").toString().replace(/\n/g, "\\n"));
```

##### Using `GH_APP_PRIVATE_KEY` env var:

```yaml
- name: Trigger and Wait for Workflow
  uses: dragoscops/workflow-trigger-wait@v3
  with:
    credentials: |
      {
        "appId": "${{ vars.GH_APP_ID }}",
        "privateKey": "empty",
        "owner": "dragoscops"
      }
    ...
  env:
    GH_APP_PRIVATE_KEY: |
      ${{ secrets.GH_APP_PRIVATE_KEY_RAW }}
```

#### Trigger and Perform Additional Actions Before Waiting

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
        uses: dragoscops/workflow-trigger-wait@v3
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
        uses: dragoscops/workflow-trigger-wait@v3
        with:
          credentials: |
            {
              "token": "${{ secrets.GH_TOKEN }}"
            }
          repo: "owner/target-repo"
          run_id: ${{ steps.trigger.outputs.run_id }}
          action: "wait-only"
          wait_interval: "15s"
          timeout: "20m"
```

---

### Modes of Operation

1. **`trigger-and-wait` (default):** Triggers the workflow and waits for it to complete.
2. **`trigger-only`:** Only triggers the workflow without waiting.
3. **`wait-only`:** Waits for a specific workflow to complete. Requires a `run_id`.

---

## Development

### Running Tests

Run the following command to execute tests:

```bash
npm test
```

### Building

Use this command to build the action:

```bash
npm run build
```

---

## Contributing

Contributions are welcome! Please submit issues or pull requests for any bugs or feature requests.
