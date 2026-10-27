# LinkedIn MCP collector

An optional local collector for the CRM. Requires Node.js 24, the running Docker Compose application, and network access. It uses the pinned public `linkedin-mcp-search@1.0.3` STDIO MCP server and MCP SDK. It does not use a LinkedIn account, browser session, or AI API key.

```text
Codex daily schedule (20:00 Europe/Tallinn)
  -> node collector/run.mjs collect
  -> LinkedIn MCP: search_jobs, get_job_details
  -> raw responses + normalized JSON + durable pending batches
  -> CRM session login and POST /api/imports
  -> PostgreSQL vacancies
  -> React opportunity library
```

The web application reads the database through its API. It does not read the collector's files. Refresh the opportunity library to see an import that completed while the page was already open. The collector does not automatically save applications or apply to employers.

## First run

From the repository root, with the application running:

```sh
npm --prefix collector ci --ignore-scripts
npm --prefix collector run setup
npm --prefix collector run collect
```

Use `npm.cmd` on Windows PowerShell if the PowerShell execution policy blocks `npm.ps1`.

Setup generates a random password and creates a separate local CRM account called **LinkedIn Collector**. Its email and password are stored in `collector/.env`, ignored by Git. Subsequent runs use those credentials with the existing session login and rotated CSRF tokens. They do not depend on a browser login or the public demo account. The account has the same catalogue permissions as other CRM users; it is not an administrator or an import-only role.

To target another local port, set `CRM_BASE_URL` before setup, or edit that value in `collector/.env`. Plain HTTP is accepted only for loopback addresses; remote origins require HTTPS. Credentials are only sent to the configured CRM origin, and redirects are refused. They are not forwarded to the MCP child process or written to run reports.

## Search profile

Edit [search-profile.json](search-profile.json) to change the searches. The initial personal profile covers:

- Software engineering/development, plus QA, test automation, DevOps and data engineering.
- Tallinn and its metropolitan area, plus remote software roles explicitly listed in Estonia.
- Java, C#, TypeScript, JavaScript, Python and React as one additional search, rather than a required stack for every vacancy.
- All seniority levels, because no maximum experience requirement was supplied; seniority stays visible in the vacancy.
- English, Estonian and Russian. Explicit mandatory requirements for another recognized language are skipped conservatively; optional skills are retained. Language detection is not comprehensive and descriptions remain the source of truth.
- A rolling seven-day window, overlapping between daily runs so a temporary missed day can be recovered within that window.

Each query reads one bounded MCP result page (up to 15 returned items) and the collector reads at most 40 unique descriptions per run, with a delay between requests. It does not promise exhaustive coverage of LinkedIn. Search counts and budget warnings are recorded. A posting with a new LinkedIn ID is considered a different vacancy even if the title is similar.

The MCP server sometimes returns incomplete or conflicting workplace/employment fields. The collector checks the description for work arrangements and leaves multiple/unclear arrangements as `UNSPECIFIED`. Original responses and warnings are retained. It preserves unknown stacks, source links, and full descriptions up to the API limit; it does not invent missing salaries or requirements.

## Files, retries and deduplication

All runtime data is local and ignored by Git:

```text
.local/collector/
  latest-report.json
  runs/<run-id>/
    raw.json                 MCP search responses and descriptions
    payload.json             normalized source=linkedin import data
    report.json              queries, skips, warnings and delivery outcome
    *.receipt.json           confirmed CRM IDs and creation/update counts
  pending/*.json             batches awaiting confirmed delivery
```

The collector collapses overlapping query results by LinkedIn ID. The CRM enforces the unique `(source, externalId)` pair in PostgreSQL, serializes same-source imports, and imports each batch atomically. Using `source=linkedin` and the numeric LinkedIn posting ID makes repeated delivery safe. Existing descriptions may change; private application status, notes and history are not touched.

A pending batch is removed only after a complete successful CRM acknowledgement has been saved. A crash after the database commits but before acknowledgement can cause a replay, which updates the same records. Oversized runs are split into bounded batches, so atomicity applies per batch. Old pending batches are delivered before newer ones. A run lock prevents overlapping collector processes.

If CRM is unavailable, the collection files and pending batches remain. To retry without searching LinkedIn again:

```sh
npm --prefix collector run retry
```

The next normal collection also retries pending batches. A successful run exits 0; failures or undelivered batches exit 2. A successful empty search is not a failure. Reports distinguish skipped postings, source failures, normalization warnings, created records, updates and outstanding batches. If a process is interrupted, a later run recovers its lock only after the owning process has exited.

## Daily Codex schedule

The scheduled task lives in Codex, not in this repository, Spring Boot, or GitHub Actions. It invokes the same tested collector command from this checkout, checks the report, and reports new vacancies or failures. An unchanged catalogue does not need a notification. It never submits applications or changes personal application data.

The schedule must use **20:00 Europe/Tallinn**, including Estonia's daylight-saving changes. Keep the computer awake with Codex, Docker Desktop and the CRM running. A powered-off machine cannot execute a local task, and missed scheduler runs are not guaranteed to be replayed. The seven-day search overlap and durable pending batches provide bounded recovery once a run occurs again.

## Verification

```sh
npm --prefix collector test
```

Offline tests verify stable identity, location and language handling, uncertain metadata, experience extraction, byte-bounded batches, session/CSRF rotation, credential separation and complete delivery acknowledgements. CI does not access LinkedIn or require real credentials. The backend integration suite separately verifies concurrent/idempotent imports and preservation of personal status, notes and history.
