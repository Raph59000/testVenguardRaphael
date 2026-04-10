# Submission Notes

### Assumptions

- GitHub UI is in English — locators are based on English aria-labels.
- The issue page goes through `/_graphql` for all write operations. That's why `waitForResponse` targets it rather than a REST endpoint.
- For `after creating an issue via API, edit it and assert via API` and `after creating an issue via API, close it and assert via API`, the brief does not explicitly specify whether the edit/close should be done via UI or API. Since `_updateIssue` and `_closeIssue` were already available in the helpers, I chose to perform these actions via API in `issues_.spec.js`. For the comment spec, UI interactions were kept to cover a broader range of patterns. This results in: 2 full-API tests, 2 hybrid tests (API + UI), and 2 full-UI tests across the suite.
- A `storageState` file is required for the browser session. No automated login flow was implemented. To generate one, run the following command, log in to GitHub in the browser that opens, then close it:
  ```bash
  npx playwright codegen --save-storage=storage-state.json https://github.com/login
  ```
  Then set `GITHUB_STORAGE_STATE=./storage-state.json` in your `.env`.

### Tradeoffs

- **`/_graphql` as response filter**: it's tied to GitHub's internals, but there's no REST signal to hook into for UI actions on the issue page.
- **No `_closeIssue` in test 3**: the issue is already closed by the test itself — adding a cleanup call there would be noise.

### Stability

The suite was run 8 consecutive times against a clean repo to verify absence of flakiness. All runs passed.

### What I would improve with another hour

- **`globalSetup` for `storageState`**: a script that logs in via the UI and saves the session automatically, so there's no manual step before running the suite.
