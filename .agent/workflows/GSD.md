# GSD Workflow: Plan Before Coding

// turbo-all

## Phase 1: The Technical Brief
Before any code is written, the agent MUST provide a structured brief containing:
- **Objective**: What is the goal?
- **Logic**: A plain-English explanation of the mathematical or architectural approach.
- **Scope**: Exactly which functions/files will be touched.
- **Verification**: How the user can verify the change is working (e.g. Console logs, UI elements).

## Phase 2: The Approval Handshake
The agent MUST WAIT for the user to explicitly say "Proceed", "Go", or equivalent before calling any code-writing tools (`write_to_file`, `replace_file_content`, etc.).

## Phase 3: Surgical Execution
- Use the smallest possible code chunks.
- Never delete variable declarations unless explicitly replacing them.
- Always check for global state compatibility.

## Phase 4: Verification
Provide the user with specific steps to test the implementation.
