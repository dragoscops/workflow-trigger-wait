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

| Name             | Required | Default     | Description                                                                 |
|------------------|----------|-------------|-----------------------------------------------------------------------------|
| `github_token`   | **Yes**  | N/A         | GitHub token for authentication.                                           |
| `repo`           | No       | N/A         | Target repository in the format `owner/repo`.                              |
| `workflow_id`    | No       | N/A         | Workflow file name or ID to trigger.                                       |
| `ref`            | No       | `main`      | Git reference (branch, tag, or commit SHA) for the workflow.               |
| `inputs`         | No       | `{}`        | JSON string of inputs for the workflow.                                    |
| `wait_interval`  | No       | `10s`       | Interval between status checks (e.g., `30s`, `1m`).                        |
| `timeout`        | No       | `1h`        | Maximum time to wait for workflow completion (e.g., `15m`, `2h`).          |
| `action`         | No       | `trigger-and-wait` | Mode of operation: `trigger-and-wait`, `trigger-only`, or `wait-only`. |
| `run_id`         | No       | N/A         | Workflow run ID (required for `wait-only`).                                |
| `no_throw`       | No       | `false`     | Suppresses errors if set to `true` or `yes`.                               |
| `debug`          | No       | `no`        | Enables debug logs if set to `true` or `yes`.                              |

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
        uses: dragoscops/workflow-trigger-wait@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          repo: "owner/target-repo"
          workflow_id: "workflow.yml"
          ref: "main"
          inputs: '{"key": "value"}'
          wait_interval: "30s"
          timeout: "15m"
          action: "trigger-and-wait"
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
        uses: dragoscops/workflow-trigger-wait@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          repo: "owner/target-repo"
          workflow_id: "workflow.yml"
          ref: "main"
          inputs: '{"param1": "value1"}'
          action: "trigger-only"

      # Additional actions can be performed here before waiting

      - name: Wait for Workflow Completion
        uses: dragoscops/workflow-trigger-wait@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
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
