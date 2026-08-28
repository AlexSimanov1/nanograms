# CLAUDE.md

## Project

This is a small pet project for solving Japanese crosswords (nonograms).

The project is intentionally simple.

Before making architectural or product decisions, read:

- `Нанограммы.md` — product requirements;
- `Архитектура.md` — technical architecture.

This file contains instructions for coding agents.

---

# 1. General principles

## 1.1. Keep it simple

Prefer the simplest solution that correctly solves the current task.

Do not introduce complexity for hypothetical future requirements.

Prefer:

- standard library;
- explicit data structures;
- small functions;
- clear control flow;
- simple dependencies;
- small, reviewable changes.

---

## 1.2. Do not over-engineer

Do not introduce without an explicit requirement:

- microservices;
- databases;
- Redis;
- message brokers;
- CQRS;
- event sourcing;
- dependency injection frameworks;
- generic repository frameworks;
- complex caching;
- API gateways;
- distributed infrastructure.

This is a pet project.

---

# 2. Architecture

The application is a modular monolith.

The important boundaries are:

```text
Frontend <-> HTTP API
Application <-> Storage
Domain <-> Infrastructure
```

Do not bypass these boundaries without a concrete reason.

## Frontend

Frontend communicates with the backend only through HTTP.

It must not know:

- Go implementation details;
- filesystem paths;
- JSON storage internals.

## Backend

Backend is written in Go.

Domain/application code must not directly access the filesystem.

## Storage

Puzzle data is stored in JSON files.

Storage implementation owns:

- filesystem access;
- filenames;
- directories;
- JSON encoding/decoding.

# 3. Go rules

Use idiomatic Go.

Prefer the standard library.

Typical packages:

- net/http;
- encoding/json;
- context;
- errors;
- fmt;
- os;
- path/filepath;
- time;
- log/slog.

Keep functions small and focused.

Prefer early returns.

Handle errors explicitly.

Wrap errors with useful context:

```go
return fmt.Errorf("load puzzle %q: %w", id, err)
```

Do not silently ignore errors.

Do not use global mutable state unless there is a strong reason.

Assume HTTP handlers may execute concurrently.

# 4. Domain rules

Core puzzle logic belongs outside HTTP handlers and storage code.

Domain logic should be deterministic and testable.

Examples:

- cell states;
- puzzle validation;
- clue calculations;
- game state transitions;
- solution checking.

Do not make domain code depend on:

- net/http;
- filesystem;
- JSON storage;
- frontend.

# 5. Storage rules

Puzzle files live in a data directory similar to:

```text
data/
└── puzzles/
    ├── 001.json
    ├── 002.json
    └── ...
```

Do not hardcode puzzle content in Go source.

Do not modify puzzle files during normal gameplay.

Validate puzzle data when loading it.

Puzzle format should contain a version.

Do not build a migration framework unless a real format migration is required.

If an interface is useful at the application/storage boundary, keep it small.

Do not create generic abstractions such as:

```go
type Repository[T any] interface { ... }
```

without a concrete need.

# 6. HTTP API

The API uses:

```text
/api/v1/
```

Example endpoints:

```text
GET /api/v1/puzzles
GET /api/v1/puzzles/{id}
```

Handlers must remain thin.

A handler should:

1. parse input;
2. validate input;
3. call application logic;
4. map the result to an HTTP response.

Handlers must not:

- read files directly;
- implement puzzle rules;
- know storage paths.

Breaking API changes are acceptable during MVP because frontend and backend are released together.

Do not maintain multiple API versions.

# 7. Frontend rules

Frontend owns:

- presentation;
- interaction;
- current UI state;
- local progress;
- timer;
- mobile interaction.

The frontend should not become the authoritative implementation of domain rules merely because some logic is convenient to write there.

20×20 is a normal supported puzzle size.

Mobile is part of the MVP.

Do not rely on:

- hover;
- right-click;
- keyboard-only interaction.

# 8. User progress

Users are anonymous in the MVP.

Progress is stored client-side.

Do not add backend sessions, authentication or user accounts just to persist game progress.

Stored progress should:

- survive page reloads;
- be associated with puzzle ID;
- have a versionable structure;
- fail gracefully if corrupted.

# 9. Testing

Prioritize tests for:

- domain logic;
- puzzle validation;
- puzzle loading;
- clue calculations;
- game state transitions;
- API behavior.

Use table-driven tests when appropriate.

Tests should be deterministic and fast.

Do not spend excessive effort testing trivial wiring or framework behavior.

# 10. Dependencies

Before adding a dependency, ask:

> Can this be solved cleanly using the Go standard library?

If yes, use the standard library.

A dependency should have a clear purpose and should not force a large architectural commitment.

# 11. Docker

The project must remain runnable with:

```text
docker compose up
```

Do not add additional runtime services without a concrete requirement.

The MVP should not require:

- database container;
- Redis;
- message broker;
- reverse proxy;
- Kubernetes.

Prefer a multi-stage Docker build.

# 12. Configuration

Keep configuration minimal.

Prefer environment variables for:

- HTTP listen address;
- data directory;
- log level.

Provide sensible defaults.

The application should work with:

```text
docker compose up
```

without requiring manual infrastructure setup.

# 13. Logging

Use structured logging where appropriate.

Log meaningful events:

- startup;
- configuration errors;
- puzzle loading errors;
- unexpected application/API errors.

Do not log every user interaction or every cell change.

Do not log sensitive information unnecessarily.

# 14. Agent workflow

## Step 1: Inspect

Before changing code:

- inspect the repository;
- read relevant files;
- inspect existing tests;
- inspect related API/data structures;
- check the current architecture.

Do not assume that the repository exactly matches the documentation.

## Step 2: Plan

For a non-trivial task, identify:

- affected components;
- required changes;
- API/data contract changes;
- tests that need to be added or changed.

Choose the smallest solution that satisfies the requirement.

## Step 3: Implement

Make focused changes.

Do not refactor unrelated code.

Do not rewrite working code merely to make it look different.

## Step 4: Verify

For backend changes, run:

```text
gofmt -w .
go vet ./...
go test ./...
```

Use the project’s actual frontend checks when changing frontend code.

If the build/runtime is affected, verify Docker Compose.

## Step 5: Review

Before finishing, check:

- Is the requested behavior implemented?
- Are architectural boundaries preserved?
- Did I introduce unnecessary abstraction?
- Did I introduce an unnecessary dependency?
- Did I accidentally couple frontend and backend?
- Did I change an API contract?
- Did I change the puzzle data format?
- Are relevant tests present?
- Does the project still build and run?

# 15. Architectural escalation

Do not silently make fundamental architectural changes.

Stop and ask for clarification before introducing:

- a database;
- a new runtime service;
- authentication;
- server-side user state;
- a major dependency;
- a new API versioning strategy;
- a fundamentally different storage model;
- microservices;
- a new deployment model.

Ordinary implementation details should be decided autonomously.

# 16. Change discipline

Prefer:

```text
small task
   ↓
small change
   ↓
tests
   ↓
verification
```

Avoid combining unrelated changes in one task.

If a refactoring is required to implement the requested feature safely, keep it narrowly scoped and explain why it is necessary.

# 17. Definition of Done

A task is complete when:

- requested behavior works;
- existing behavior remains intact unless intentionally changed;
- relevant tests pass;
- formatting/linting passes;
- architecture remains consistent with `Архитектура.md`;
- product behavior remains consistent with `Нанограммы.md`;
- no unnecessary dependencies were added;
- no unrelated refactoring was introduced;
- Docker Compose still works when relevant.

# 18. Priority when making decisions

When requirements do not provide a clear answer, use this order:

1. correctness;
2. simplicity;
3. architectural boundaries;
4. maintainability;
5. performance;
6. future extensibility.

Do not sacrifice simplicity for hypothetical future requirements.

Build the system that is needed now, while keeping the important boundaries clean enough to evolve later.