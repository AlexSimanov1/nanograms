# CLAUDE.md

## 1. Purpose

This repository is a small pet project for solving Japanese crosswords (nonograms) in a web browser.

Code will often be written or modified by coding agents. Agents must optimize for:

1. correctness;
2. simplicity;
3. maintainability;
4. consistency with the existing architecture;
5. small, reviewable changes.

Do not introduce complexity unless it solves a concrete current problem.

---

# 2. Product and architectural context

The application is a **modular monolith**.

The MVP has:

- a Go backend;
- a web frontend;
- JSON files as the primary persistent source of puzzle data;
- local browser storage for anonymous user progress;
- one Docker Compose deployment;
- one runtime application/container in the MVP.

The intended architecture is:

~~~text
Browser
├── Frontend
└── Local progress
        │
       HTTP
        │
        ▼
Go monolith
├── HTTP/API
├── Application
├── Domain
├── Storage
└── Static frontend
        │
        ▼
   JSON puzzle files
~~~

The frontend and backend are logically separate even though they are deployed together.

Future separation should be possible:

~~~text
Frontend container/CDN
        │
       HTTP
        │
        ▼
Go backend
        │
        ▼
Storage
~~~

Do not design the MVP as microservices.

---

# 3. Core engineering principles

## 3.1. Prefer boring solutions

Use the simplest implementation that satisfies the requirement.

Prefer:

- standard library;
- small functions;
- explicit data structures;
- straightforward control flow;
- local reasoning;
- conventional project structure.

Avoid introducing abstractions merely because they might be useful someday.

---

## 3.2. Do not over-engineer the MVP

Do not add:

- microservices;
- CQRS;
- event sourcing;
- message brokers;
- Redis;
- database infrastructure;
- dependency injection frameworks;
- generic repository frameworks;
- elaborate domain-driven-design machinery;
- unnecessary design patterns;
- premature caching;
- premature distributed-system concerns.

If a feature does not require one of these, do not introduce it.

---

## 3.3. Preserve architectural boundaries

The three important boundaries are:

~~~text
Frontend <-> HTTP API
Application <-> Storage
Application/Domain <-> Infrastructure
~~~

Do not bypass these boundaries without a concrete reason.

For example:

- frontend must not depend on Go implementation details;
- domain logic must not read files directly;
- application logic must not know JSON file paths;
- HTTP handlers must not contain business logic.

---

# 4. Go backend rules

## 4.1. Standard library first

Prefer Go standard library packages when they are sufficient.

Typical building blocks:

- `net/http`;
- `encoding/json`;
- `context`;
- `errors`;
- `fmt`;
- `io`;
- `os`;
- `path/filepath`;
- `time`;
- `slog`.

Add a third-party dependency only when it provides meaningful value that would otherwise require substantial code or introduce avoidable risk.

Before adding a dependency, ask:

> Can this be solved cleanly with the standard library?

If yes, prefer the standard library.

---

## 4.2. Keep packages focused

Packages should have clear responsibilities.

Prefer a structure similar to:

~~~text
cmd/
internal/
├── domain/
├── application/
├── storage/
├── http/
└── ...
frontend/
data/
~~~

The exact package names may evolve with the implementation, but responsibilities must remain clear.

Do not create a package for every tiny concept.

---

## 4.3. Domain must not depend on infrastructure

Domain types and rules should not import:

- `os`;
- filesystem-specific code;
- HTTP packages;
- JSON storage implementation;
- frontend-specific code.

The domain should be usable independently of how data is stored or transported.

---

## 4.4. Storage behind explicit interfaces

When application logic needs persistent data, depend on an appropriate interface rather than directly accessing files.

Example:

~~~go
type PuzzleRepository interface {
    Get(ctx context.Context, id string) (*Puzzle, error)
    List(ctx context.Context) ([]Puzzle, error)
}
~~~

The JSON implementation belongs to infrastructure/storage.

Do not create generic abstractions such as:

~~~go
type Repository[T any] interface { ... }
~~~

unless a concrete need appears.

---

## 4.5. Context

Pass `context.Context` through application and I/O boundaries where appropriate.

Do not store context in structs.

Do not create contexts inside lower-level functions unless that function owns the lifetime by design.

---

## 4.6. Errors

Errors must be explicit and actionable.

Prefer wrapping errors with context:

~~~go
return fmt.Errorf("load puzzle %q: %w", id, err)
~~~

Do not silently ignore errors unless ignoring them is intentional and obvious.

Do not expose internal filesystem or implementation details directly through the HTTP API.

Map internal errors to appropriate HTTP responses at the HTTP boundary.

---

## 4.7. Concurrency

Assume the HTTP server may process requests concurrently.

Any shared mutable state must be deliberately synchronized.

Do not introduce global mutable state unless there is a clear reason.

For MVP, prefer immutable puzzle data and stateless request handling.

---

# 5. JSON storage rules

Puzzle content is stored as ordinary JSON files.

Example:

~~~text
data/
└── puzzles/
    ├── 001.json
    ├── 002.json
    └── ...
~~~

Puzzle files should contain a format version:

~~~json
{
  "version": 1,
  "id": "001",
  "width": 10,
  "height": 10,
  "difficulty": "medium",
  "rowHints": [],
  "columnHints": [],
  "solution": []
}
~~~

Rules:

- do not hardcode puzzle content in Go source;
- do not mutate puzzle files during normal gameplay;
- validate puzzle data when loading it;
- keep file format deterministic and human-readable;
- avoid unnecessary fields;
- do not build a migration framework unless the need actually appears.

The puzzle repository owns knowledge about filenames, directories and JSON encoding.

---

# 6. User progress

MVP users are anonymous.

User progress should normally live in browser storage, not on the backend.

The backend should not acquire user/session persistence merely for convenience.

Future authenticated/server-side progress may be added later.

When implementing progress-related frontend code:

- make persistence resilient to page reloads;
- keep the stored representation versionable;
- do not couple progress storage to DOM structure;
- keep puzzle content and user progress as separate concepts.

---

# 7. HTTP API

## 7.1. API is a real boundary

Even though frontend and backend are deployed together, communicate through HTTP.

Do not call backend internals from frontend.

Use API paths such as:

~~~text
/api/v1/puzzles
/api/v1/puzzles/{id}
~~~

For MVP, only version `v1` is needed.

Multiple simultaneously supported API versions are not required.

Breaking API changes are acceptable while frontend and backend are released together.

---

## 7.2. Keep handlers thin

HTTP handlers should:

1. parse and validate request input;
2. call an application service;
3. translate the result into an HTTP response.

Handlers should not implement domain rules.

Avoid:

~~~text
handler
 ├── read files
 ├── parse puzzle
 ├── validate puzzle
 ├── calculate domain result
 └── build response
~~~

Prefer:

~~~text
handler
   ↓
application service
   ↓
domain
   ↓
repository
~~~

---

## 7.3. DTOs at the HTTP boundary

Do not automatically expose internal domain structs as API contracts.

Use request/response types where that makes the boundary clearer.

JSON serialization details should not leak into domain types unless there is a strong reason.

---

# 8. Frontend rules

The frontend is a separate logical application.

It should:

- communicate with the backend only through HTTP;
- own presentation and interaction logic;
- own local puzzle progress;
- not know how JSON puzzle files are stored on the server;
- not depend on Go internals.

The UI should remain usable on:

- desktop;
- mobile portrait;
- mobile landscape.

20×20 is a normal supported puzzle size and must not be treated as an exceptional case.

---

# 9. Game logic

Puzzle-solving rules are important domain logic.

Keep them deterministic and testable.

Avoid implementing core puzzle rules directly inside:

- HTTP handlers;
- UI components;
- filesystem code.

A useful conceptual split is:

~~~text
Puzzle definition
      ↓
Game state
      ↓
Game/domain logic
      ↓
UI
~~~

The UI renders state; it should not become the authoritative source of puzzle rules.

---

# 10. Mobile interaction

Mobile is part of the MVP.

The interaction model must not rely on:

- hover;
- right mouse button;
- keyboard-only shortcuts.

The game should support:

- tap;
- explicit fill/cross modes;
- clearing cells;
- drag where appropriate.

Any gesture implementation must be predictable and easy to undo.

Do not add complicated gesture systems without a demonstrated UX need.

---

# 11. Testing

Tests should be concentrated where they provide the most value.

### High priority

- puzzle validation;
- puzzle loading;
- domain/game logic;
- clue/solution calculations;
- state transitions;
- API behavior;
- important persistence behavior.

### Lower priority

Do not write large numbers of tests for trivial getters, simple wiring or framework behavior.

Tests should be deterministic and fast.

Prefer table-driven tests in Go where they improve readability.

Example:

~~~go
tests := []struct {
    name string
    // ...
}{
    // ...
}
~~~

---

# 12. Validation

Validate data at boundaries.

Examples:

- puzzle JSON must be structurally valid;
- puzzle dimensions must be valid;
- solution dimensions must match puzzle dimensions;
- hints must be consistent with dimensions;
- API input must be validated before application logic receives it.

Do not rely on every caller being correct.

---

# 13. Frontend/backend changes

When changing an API contract:

1. identify all frontend consumers;
2. update backend and frontend together;
3. update relevant tests;
4. update documentation if the contract is externally meaningful.

Do not preserve obsolete API behavior solely for hypothetical future clients.

The MVP is a single coordinated application.

---

# 14. Docker rules

The repository must remain runnable with:

~~~bash
docker compose up
~~~

The Docker setup should be straightforward.

Prefer a multi-stage Dockerfile:

~~~text
frontend build
      ↓
Go build
      ↓
small runtime image
~~~

Do not add containers unless they solve a real requirement.

The MVP should not require:

- database containers;
- Redis;
- message brokers;
- reverse proxies;
- orchestration platforms.

---

# 15. Configuration

Configuration should be explicit and minimal.

Prefer environment variables for deployment-specific values such as:

- HTTP listen address;
- data directory;
- logging level.

Do not introduce a complex configuration framework.

Provide sensible local defaults.

The application should be easy to start with no configuration beyond:

~~~bash
docker compose up
~~~

---

# 16. Logging

Logs should help diagnose real problems.

Use structured logging where practical.

Log:

- server startup;
- configuration problems;
- failed puzzle loading;
- unexpected request/application errors.

Do not log:

- excessive per-cell gameplay events;
- sensitive user information;
- entire request bodies without a reason.

Avoid noisy logs during normal puzzle solving.

---

# 17. API and data compatibility

For the MVP:

- breaking changes are acceptable;
- frontend and backend are released together;
- do not maintain multiple API versions;
- do not create compatibility layers for old internal structures.

However, data files should have explicit versions so that a future format change can be handled deliberately.

---

# 18. Code style

Write idiomatic Go.

Prefer:

- short functions with clear responsibilities;
- early returns;
- explicit error handling;
- meaningful names;
- small interfaces;
- composition over inheritance-style abstractions;
- comments explaining **why**, not what obvious code does.

Avoid:

- clever one-liners;
- unnecessary reflection;
- global mutable state;
- magic constants;
- deeply nested conditionals;
- huge files with unrelated responsibilities.

Run formatting tools before considering Go code complete.

At minimum:

~~~bash
gofmt
go vet
go test ./...
~~~

Use additional project-specific checks if they exist.

---

# 19. Dependency policy

Before adding a dependency, verify:

1. the standard library is insufficient;
2. the dependency has a clear and narrow purpose;
3. it is actively maintained or otherwise justified;
4. it does not force a large architectural commitment.

Do not add a dependency simply because it saves a few lines of code.

---

# 20. Agent workflow

When working on a task:

## Step 1 — Understand

Before editing code:

- inspect the repository structure;
- read relevant existing code;
- identify existing architectural boundaries;
- inspect tests;
- inspect related API/data contracts.

Do not assume the repository looks like the examples in this document.

## Step 2 — Plan

For non-trivial tasks, briefly identify:

- what needs to change;
- which modules are affected;
- whether an API/data contract changes;
- what tests are required.

Prefer the smallest change that fully solves the task.

## Step 3 — Implement

Implement in small, coherent changes.

Do not refactor unrelated code while implementing a feature unless the refactor is required to make the feature correct.

## Step 4 — Verify

Run appropriate checks.

For backend changes, normally run:

~~~bash
go test ./...
go vet ./...
gofmt -w ...
~~~

For frontend changes, run the project's formatter, linter and tests/build.

For integration changes, verify the Docker Compose workflow.

## Step 5 — Review

Before finishing, check:

- Does the implementation follow the architecture?
- Did I introduce unnecessary dependencies?
- Did I add unnecessary abstraction?
- Did I accidentally couple frontend and backend?
- Did I change an API or data format?
- Are tests sufficient for the changed behavior?
- Does the application still run with Docker Compose?

---

# 21. Rules for autonomous coding agents

Agents must not make broad architectural decisions silently.

If a task appears to require:

- adding a database;
- introducing a new service;
- changing the storage model;
- changing the API versioning strategy;
- adding a major dependency;
- changing the deployment model;
- breaking a fundamental architectural boundary;

stop and explain the trade-off before proceeding, unless the user explicitly requested that architectural change.

For ordinary implementation decisions, proceed autonomously.

Prefer a small, working solution over a theoretically perfect one.

---

# 22. Definition of Done for code changes

A code change is considered complete when:

- the requested behavior is implemented;
- existing behavior is preserved unless intentionally changed;
- the architecture remains consistent with this document;
- relevant tests are added or updated;
- formatting/linting checks pass;
- no unnecessary dependencies were introduced;
- no unrelated refactoring was included;
- Docker Compose still works when the change affects the build/runtime;
- the implementation is understandable to another developer.

---

# 23. Final principle

When in doubt, follow this priority order:

1. **Correctness**
2. **Simplicity**
3. **Clear architectural boundaries**
4. **Maintainability**
5. **Performance**
6. **Future extensibility**

Do not sacrifice simplicity for hypothetical future requirements.

The project is a pet project first. Build only as much architecture as the current product actually needs.