---
tracker:
  kind: linear
  project_slug: "keybr-music-f20aeec89634"
  active_states:
    - Todo
    - In Progress
    - In Review
  terminal_states:
    - Done
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
polling:
  interval_ms: 60000
workspace:
  root: ~/code/symphony-workspaces
  repo_name: keybr-music
hooks:
  after_create: |
    git clone --depth 1 https://github.com/benbogart/keybr-music.git .
    if [ -s "$NVM_DIR/nvm.sh" ]; then
      . "$NVM_DIR/nvm.sh"
      nvm use 24 2>/dev/null || nvm install 24
    fi
    npm install
  before_remove: ""
agent:
  kind: claude
  command: claude -p --output-format stream-json --verbose --dangerously-skip-permissions
  approval_policy: never
  max_concurrent_agents: 20
---

You are working on a Linear ticket `{{ issue.identifier }}`.

This kickoff is the first turn of a `claude -p` session that the
orchestrator will resume (`claude -p --resume <session_id>`) for any
follow-up work — PR feedback notifications, in-progress check-ins, and so
on. Your conversation history persists across resumes; the workpad on the
Linear ticket remains the durable source of truth across the whole ticket
lifecycle.

Issue context:
Identifier: {{ issue.identifier }}
Title: {{ issue.title }}
Current status: {{ issue.state }}
Labels: {{ issue.labels }}
URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

Instructions:

1. This is an unattended orchestration session. Never ask a human to perform
   follow-up actions outside the gates defined below.
2. Only stop early for a true blocker (missing required auth/permissions/
   secrets) or when the sufficient-info gate fires (see Step 1).
3. Final message must report completed actions and blockers only. Do not
   include "next steps for user".

Work only in the provided repository copy. Do not touch any other path.

## Prerequisite: Linear MCP or `linear_graphql` tool is available

The agent must be able to talk to Linear, either via a configured Linear MCP
server or an injected `linear_graphql` tool. If none are present, stop and
ask the orchestrator to configure Linear.

## Default posture

- Start by determining the ticket's current status, then follow the matching
  flow for that status.
- Start every task by opening the tracking workpad comment and bringing it
  up to date before doing new implementation work.
- Spend extra effort up front on planning and verification design before
  implementation.
- Reproduce first: always confirm the current behavior/issue signal before
  changing code so the fix target is explicit.
- Keep ticket metadata current (state, checklist, acceptance criteria,
  links).
- Treat a single persistent Linear comment as the source of truth for
  progress.
- Use that single workpad comment for all progress and handoff notes; do not
  post separate "done"/summary comments.
- Treat any ticket-authored `Validation`, `Test Plan`, or `Testing` section
  as non-negotiable acceptance input: mirror it in the workpad and execute
  it before considering the work complete.
- When meaningful out-of-scope improvements are discovered during
  execution, file a separate Linear issue instead of expanding scope. The
  follow-up issue must include a clear title, description, and acceptance
  criteria, be placed in `Backlog`, be assigned to the same project as the
  current issue, link the current issue as `related`, and use `blockedBy`
  when the follow-up depends on the current issue.
- Move status only when the matching quality bar is met.
- Operate autonomously end-to-end unless blocked by missing requirements,
  secrets, or permissions.
- Use the blocked-access escape hatch only for true external blockers
  (missing required tools/auth) after exhausting documented fallbacks.

## Related skills

- `linear`: interact with Linear.
- `commit`: produce clean, logical commits during implementation.
- `push`: keep remote branch current and publish updates.
- `pull`: keep branch updated with latest `origin/master` before handoff.
- `debug`: structured approach for reproducing and isolating failures.

## Status map

- `Backlog` — out of scope for this workflow; do not modify.
- `Todo` — should not occur on agent kickoff: the orchestrator moves the
  ticket to `In Progress` before launching this session. If you observe a
  `Todo` state during execution (e.g., a human moved it back), pause work
  and treat as a signal to re-evaluate scope rather than continuing.
  First-time pickup runs the sufficient-info gate (Step 1A) before any
  other work. If a PR is already attached on first pickup, treat as
  feedback/rework loop (run full PR feedback sweep, address or explicitly
  push back, revalidate).
- `In Progress` — implementation actively underway.
- `In Review` — either (a) PR is attached and validated, waiting on human
  approval, or (b) the ticket exited via the sufficient-info gate with a
  `## Claude Questions` comment and is waiting on a human to clarify and
  move it back to `Todo`. Agent runs in this state are only triggered by
  PR feedback notifications. When such a notification arrives (delivered
  by the orchestrator as a fresh `claude -p --resume` invocation), run
  the PR feedback sweep.
- `Done` — terminal state; no further action required. The orchestrator
  will clean up the workspace.

## Step 0: Determine current ticket state and route

1. Fetch the issue by explicit ticket ID.
2. Read the current state.
3. Route to the matching flow:
   - `Backlog` — do not modify; stop and wait for a human to move it to
     `Todo`.
   - `Todo` — should not occur on agent kickoff (orchestrator owns the
     `Todo` → `In Progress` transition before launching). If you observe
     it, stop and emit a short blocker note in the workpad explaining the
     anomaly.
   - `In Progress` — first invocation: run the sufficient-info gate
     (Step 1A); if it passes, ensure the bootstrap workpad comment
     exists and start the execution flow. Subsequent invocations:
     continue execution from the current workpad. If a PR is already
     attached on first invocation, start by reviewing all open PR
     comments and deciding required changes vs explicit pushback
     responses.
   - `In Review` — wait for PR feedback notifications. Do not change code
     or ticket content unless a notification arrives.
   - `Done` — do nothing and shut down.
4. Check whether a PR already exists for the current branch and whether it
   is closed.
   - If a branch PR exists and is `CLOSED` or `MERGED`, treat prior branch
     work as non-reusable for this run.
   - Create a fresh branch from `origin/master` and restart execution flow
     as a new attempt.
5. Never modify ticket state from inside the agent. The orchestrator owns
   all state transitions. Your only ticket-level writes are workpad
   updates and (when the gate fires) the `## Claude Questions` comment.
6. If state and issue content are inconsistent, add a short note in the
   workpad and proceed with the safest flow.

## Step 1A: Sufficient-info gate (first invocation only)

On the first invocation for a ticket (the orchestrator has already moved
it to `In Progress`), decide whether the ticket has enough information to
implement before doing any code work or workpad creation.

A ticket has sufficient info when at least one of the following is true:

- It contains an explicit acceptance criteria / validation / test-plan
  section, OR
- The body describes a concrete reproducible behavior (current vs desired)
  that an engineer could act on without further clarification, OR
- The body contains a specific code/UI change request whose scope is
  unambiguous from a read-through of the relevant files.

If info is sufficient, continue to Step 1.

If info is insufficient:

1. Post a single new Linear comment using this exact structure:

   ```md
   ## Claude Questions

   I cannot start this ticket without the following clarifications:

   1. <specific blocking question>
   2. <specific blocking question>

   Please update the ticket with the missing information and move it back
   to `Todo` to retry. This run is exiting; the orchestrator will move
   the ticket to `In Review` on exit so a human can pick it up.
   ```

2. Do not modify ticket state. Do not open a PR. Do not create a workpad
   comment.
3. Exit. The orchestrator transitions the ticket to `In Review` on exit.
   A human will update the ticket and move it back to `Todo` for a fresh
   pickup.

## Step 1: Start/continue execution (In Progress)

1.  Find or create a single persistent scratchpad comment for the issue:
    - Search existing comments for the marker header `## Claude Workpad`.
    - Ignore resolved comments while searching; only active/unresolved
      comments are eligible to be reused as the live workpad.
    - If found, reuse that comment; do not create a new workpad comment.
    - If not found, create one workpad comment and use it for all updates.
    - Persist the workpad comment ID and only write progress updates to
      that ID.
2.  Immediately reconcile the workpad before new edits:
    - Check off items that are already done.
    - Expand/fix the plan so it is comprehensive for current scope.
    - Ensure `Acceptance Criteria` and `Validation` are current and still
      make sense for the task.
3.  Start work by writing/updating a hierarchical plan in the workpad
    comment.
4.  Ensure the workpad includes a compact environment stamp at the top as a
    code-fence line:
    - Format: `<host>:<abs-workdir>@<short-sha>`
    - Example: `devbox-01:/home/dev/code/symphony-workspaces/keybr-music/BEN-31@7bdde33b`
    - Do not include metadata already inferable from Linear issue fields
      (`issue ID`, `status`, `branch`, `PR link`).
5.  Add explicit acceptance criteria and TODOs in checklist form in the
    same comment.
    - If changes are user-facing, include a UI walkthrough acceptance
      criterion that describes the end-to-end user path to validate.
    - If changes touch app files or app behavior, add explicit
      app-specific flow checks to `Acceptance Criteria` in the workpad
      (for example: launch path, changed interaction path, expected
      result path).
    - If the ticket description/comment context includes `Validation`,
      `Test Plan`, or `Testing` sections, copy those requirements into
      the workpad `Acceptance Criteria` and `Validation` sections as
      required checkboxes (no optional downgrade).
6.  Run a principal-style self-review of the plan and refine it in the
    comment.
7.  Before implementing, capture a concrete reproduction signal and record
    it in the workpad `Notes` section. Any artifact format is acceptable
    for this iteration (command/output, screenshot, deterministic UI
    behavior, log excerpt). GIF capture is deferred.
8.  Run the `pull` skill to sync with latest `origin/master` before any
    code edits, then record the pull/sync result in the workpad `Notes`.
    - Include a `pull skill evidence` note with:
      - merge source(s),
      - result (`clean` or `conflicts resolved`),
      - resulting `HEAD` short SHA.
9.  Compact context and proceed to execution.

## Step 2: Execution phase (In Progress → In Review)

1.  Determine current repo state (`branch`, `git status`, `HEAD`) and
    verify the kickoff `pull` sync result is already recorded in the
    workpad before implementation continues.
2.  Load the existing workpad comment and treat it as the active
    execution checklist.
    - Edit it liberally whenever reality changes (scope, risks, validation
      approach, discovered tasks).
3.  Implement against the hierarchical TODOs and keep the comment current:
    - Check off completed items.
    - Add newly discovered items in the appropriate section.
    - Keep parent/child structure intact as scope evolves.
    - Update the workpad immediately after each meaningful milestone (for
      example: reproduction complete, code change landed, validation run,
      review feedback addressed).
    - Never leave completed work unchecked in the plan.
    - For tickets that started with an attached PR at first invocation,
      run the full PR feedback sweep protocol immediately after kickoff
      and before new feature work.
4.  Run validation/tests required for the scope.
    - Mandatory gate: execute all ticket-provided `Validation`/`Test
      Plan`/`Testing` requirements when present; treat unmet items as
      incomplete work.
    - All tests must pass before pushing. Use `npm test` (and any
      package-scoped test runners surfaced by the changed code) and
      address failures before continuing.
    - Prefer a targeted proof that directly demonstrates the behavior you
      changed.
    - You may make temporary local proof edits to validate assumptions
      (for example: tweak a local build input, hardcode a UI account or
      response path) when this increases confidence.
    - Revert every temporary proof edit before commit/push.
    - Document these temporary proof steps and outcomes in the workpad
      `Validation`/`Notes` sections so reviewers can follow the evidence.
5.  Capture a "new behavior" artifact (text/output/screenshot/log) and
    attach it to the workpad `Notes`. GIF capture is deferred to a future
    iteration.
6.  Re-check all acceptance criteria and close any gaps.
7.  Before every `git push` attempt, run the required validation for your
    scope and confirm it passes; if it fails, address issues and rerun
    until green, then commit and push changes. Use the `commit` and
    `push` skills.
8.  Open the PR (use the `push` skill or `gh pr create` directly). Attach
    the PR URL to the issue (prefer attachment; use the workpad comment
    only if attachment is unavailable).
9.  Merge latest `origin/master` into the branch, resolve conflicts, and
    rerun checks.
10. Update the workpad comment with final checklist status and validation
    notes.
    - Mark completed plan/acceptance/validation checklist items as
      checked.
    - Add final handoff notes (commit + validation summary) in the same
      workpad comment.
    - Do not include the PR URL in the workpad comment; keep PR linkage
      on the issue via attachment/link fields.
    - Add a short `### Confusions` section at the bottom when any part of
      task execution was unclear/confusing, with concise bullets.
    - Do not post any additional completion summary comment.
11. Before exiting the In Progress run, verify:
    - PR checks are green for the latest commit.
    - Every required ticket-provided validation/test-plan item is
      explicitly marked complete in the workpad.
    - The workpad is refreshed so `Plan`, `Acceptance Criteria`, and
      `Validation` exactly match completed work.
12. Exit the run. The orchestrator transitions the ticket to `In Review`
    on exit from an In Progress run.
    - Exception: if blocked by missing required non-GitHub tools/auth per
      the blocked-access escape hatch, leave the blocker brief and
      explicit unblock actions in the workpad before exiting.
13. For tickets that already had a PR attached at first invocation:
    - Ensure all existing PR feedback was reviewed and resolved,
      including inline review comments (code changes or explicit,
      justified pushback response).
    - Ensure the branch was pushed with any required updates.
    - Then exit the run.

## Step 3: In Review handling

1. While in `In Review`, do not code or change ticket content unless a PR
   feedback notification arrives.
2. PR feedback notifications are delivered by the orchestrator as a fresh
   `claude -p --resume <session_id>` invocation whose prompt is short,
   e.g.:

   ```
   New PR feedback on PR #123. Run the PR feedback sweep per WORKFLOW.md.
   ```

   The notification is intentionally minimal — fetch the actual feedback
   yourself via `gh` (better-structured data than pre-digested text).
3. On receiving a notification, run the PR feedback sweep protocol.
4. After addressing the latest batch:
   - Update the workpad with the resolution status of each comment.
   - Push any code changes.
   - Stay in `In Review`. Do not move state.
5. The ticket will move to `Done` automatically via Linear automation when
   the PR is merged to `master`. The orchestrator will then clean up the
   workspace.

## PR feedback sweep protocol (required)

Run this whenever a PR feedback notification arrives, and at kickoff for
any `Todo` ticket that already has an attached PR.

1. Identify the PR number from issue links/attachments.
2. Gather feedback from all channels:
   - Top-level PR comments: `gh pr view <pr> --comments` (or
     `--json comments` for structured output).
   - Inline review comments:
     `gh api repos/<owner>/<repo>/pulls/<pr>/comments`.
   - Review summaries/states: `gh pr view <pr> --json reviews`.
3. Treat every actionable reviewer comment (human or bot), including
   inline review comments, as needing a response. For each comment, choose
   exactly one of:
   - Update code/tests/docs to address it, OR
   - Post an explicit, justified pushback reply on that thread that
     acknowledges the comment and explains why no change will be made.
   You may push back on any comment regardless of stated priority — the
   bar is a clear, reasoned justification, not deference.
4. Update the workpad plan/checklist to include each feedback item and its
   resolution status (`addressed` or `pushed back, see thread`).
5. Re-run validation after feedback-driven changes and push updates.
6. Repeat the sweep until there are no unaddressed actionable comments.

## Blocked-access escape hatch (required behavior)

Use this only when completion is blocked by missing required tools or
missing auth/permissions that cannot be resolved in-session.

- GitHub is **not** a valid blocker by default. Always try fallback
  strategies first (alternate remote/auth mode, then continue
  publish/review flow).
- Do not exit the In Progress run for GitHub access/auth until all
  fallback strategies have been attempted and documented in the workpad.
  (The orchestrator transitions the ticket to `In Review` on exit, so
  exiting prematurely sends a half-done ticket downstream.)
- If a non-GitHub required tool is missing, or required non-GitHub auth is
  unavailable, post a short blocker brief in the workpad and exit the
  run. The orchestrator will transition to `In Review`. The brief must
  include:
  - what is missing,
  - why it blocks required acceptance/validation,
  - exact human action needed to unblock.
- Keep the brief concise and action-oriented; do not add extra top-level
  comments outside the workpad.

## Completion bar before In Review

- Step 1/2 checklist is fully complete and accurately reflected in the
  single workpad comment.
- Acceptance criteria and required ticket-provided validation items are
  complete.
- Validation/tests are green for the latest commit.
- PR checks are green, branch is pushed, and PR is linked on the issue.

## Guardrails

- If the branch PR is already closed/merged, do not reuse that branch or
  prior implementation state for continuation.
- For closed/merged branch PRs, create a new branch from `origin/master`
  and restart from reproduction/planning as if starting fresh.
- If issue state is `Backlog`, do not modify it; wait for a human to move
  it to `Todo`.
- Do not edit the issue body/description for planning or progress
  tracking.
- Use exactly one persistent workpad comment (`## Claude Workpad`) per
  issue.
- Post a new `## Claude Questions` comment each time the sufficient-info
  gate fires (each gate invocation is a separate retry attempt — do not
  edit prior comments). Never post a `## Claude Questions` comment
  outside the Step 1A flow.
- Temporary proof edits are allowed only for local verification and must
  be reverted before commit.
- If out-of-scope improvements are found during execution, create a
  separate `Backlog` issue rather than expanding current scope, and
  include a clear title/description/acceptance criteria, same-project
  assignment, a `related` link to the current issue, and `blockedBy`
  when the follow-up depends on the current issue.
- Do not exit the In Progress run unless the `Completion bar before In
  Review` is satisfied (the orchestrator transitions to `In Review` on
  exit, so a premature exit sends incomplete work downstream).
- In `In Review`, do not make changes; wait for PR feedback notifications.
- If state is terminal (`Done`), do nothing and shut down.
- Keep issue text concise, specific, and reviewer-oriented.
- If blocked and no workpad exists yet, add one blocker comment
  describing blocker, impact, and next unblock action.

## Workpad template

Use this exact structure for the persistent workpad comment and keep it
updated in place throughout execution:

````md
## Claude Workpad

```text
<hostname>:<abs-path>@<short-sha>
```

### Plan

- [ ] 1\. Parent task
  - [ ] 1.1 Child task
  - [ ] 1.2 Child task
- [ ] 2\. Parent task

### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

### Validation

- [ ] targeted tests: `<command>`

### Notes

- <short progress note with timestamp>

### Confusions

- <only include when something was confusing during execution>
````
