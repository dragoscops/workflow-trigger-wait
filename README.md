# GitHub Action: Trigger and Wait for Workflows

- [GitHub Action: Trigger and Wait for Workflows](#github-action-trigger-and-wait-for-workflows)
  - [Features](#features)
  - [Usage](#usage)
    - [Inputs](#inputs)
    - [Example Workflow](#example-workflow)
      - [Trigger and Wait](#trigger-and-wait)
      - [Trigger and Wait Lager](#trigger-and-wait-lager)
    - [Modes of Operation](#modes-of-operation)
  - [Development](#development)
    - [Running Tests](#running-tests)
    - [Building](#building)
  - [Contributing](#contributing)


This GitHub Action allows you to trigger one or more workflows from a different repository and optionally wait for them to complete. It's particularly useful for coordinating workflows across multiple repositories.

## Features

- Trigger workflows in a different repository.
- Wait for workflows to complete with customizable intervals and timeouts.
- Supports three modes of operation: `trigger-and-wait`, `trigger-only`, and `wait-only`.
- Configurable inputs for maximum flexibility.

## Usage

### Inputs

- `github_token`: **Required** - The GitHub token for authentication. 
- `repo`: The target repository in the format `owner/repo`.
- `workflow_id`: The workflow file name or ID to trigger.
- `ref`: The git reference for the workflow (branch, tag, or commit SHA). Defaults to `main`.
- `inputs`: JSON string of input parameters for the workflow. Defaults to `{}`
- `wait_interval`: Interval between status checks when waiting for the workflow to complete. Defaults to `10s`.
- `timeout`: Maximum time to wait for the workflow to complete. Defaults to `1h`.
- `action`: The action mode: `trigger-and-wait`, `trigger-only`, or `wait-only`. Defaults to `trigger-and-wait`.
- `run_id`: The run ID of the workflow to wait for. Required if `action` is `wait-only`.
- `no_throw`: If set to `yes` or `true`, will not throw errors when waiting for a workflow, instead will print the error message to `run_conclusion` output.

### Example Workflow

#### Trigger and Wait

```yaml
name: Trigger and Wait for Workflow

on:
  workflow_dispatch:

jobs:
  trigger-and-wait:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Trigger and Wait for Workflow
        uses: clbt-5f49f15a/wait-for-workflow@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          repo: "owner/target-repo"
          workflow_id: "target-workflow.yml"
          ref: "main"
          inputs: '{"exampleInput": "exampleValue"}'
          wait_interval: "30s"
          timeout: "20m"
          action: "trigger-and-wait"
```

#### Trigger and Wait Lager


```yaml
name: Trigger and Wait after Performing other Actions

on:
  workflow_dispatch:

jobs:
  run-custom-action:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Trigger Workflow
        id: trigger
        uses: clbt-5f49f15a/wait-for-workflow@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          repo: 'owner/repository'
          workflow_id: 'workflow.yml'
          ref: 'main'
          inputs: '{"param1": "value1"}'
          action: 'trigger-only'

      # other actions can be performed here

      - name: Wait for Workflow
        uses: clbt-5f49f15a/wait-for-workflow@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          run_id: ${{ steps.trigger.outputs.run_id }}
          wait_interval: '30s'
          timeout: '2h'
          action: 'wait-only'

```

### Modes of Operation

* `trigger-and-wait` (default): Triggers the specified workflow and waits for it to complete.
* `trigger-only`: Only triggers the specified workflow without waiting for it to complete.
* `wait-only`: Only waits for the specified workflow to complete. Requires run_id to be provided.


## Development

### Running Tests

To run the tests, use the following command:

```bash
npm run test
```

### Building

To build the action, use the following command:

```bash
npm run build
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.
