# EAS Workflows "Read app config" repro

Minimal reproduction of an issue where **builds started from an EAS Workflow fail on the
"Read app config" step**, while the exact same build profile succeeds when started with
`eas build` from a local machine or via the "Build from GitHub" button.

Related support thread: PLAN-PRODUCTION | EAS Workflows support (account `pickleheadscom`,
project `pickleheads`).

## The failure

In the workflow run, the `fingerprint` job's "Read app config" step **succeeds**, but the
`build` jobs (both platforms) fail their "Read app config" step with:

```
Failed to read the app config file with `expo config` command:
/home/expo/workingdir/build/node_modules/expo/bin/cli config --json --full --type public exited with non-zero code: 1
Error reading Expo config at /home/expo/workingdir/build/packages/mobile/app.config.ts:

Unexpected token '{'
```

The failure happens both when the workflow is triggered by a GitHub push and when it is
started manually with `eas workflow:run`.

## Project structure (mirrors our production app)

- pnpm monorepo (`pnpm-workspace.yaml` with `packages/*`), pnpm `10.33.0` via `packageManager`
- `.npmrc` with `node-linker=hoisted` (required for React Native), `strict-peer-dependencies=true`, `auto-install-peers=true`
- Node 24 (`.nvmrc`, `engines.node >= 24`); `eas.json` pins `"node": "24.13.1"` and `"pnpm": "10.33.0"`
- `packages/mobile` — Expo SDK 55 app with a **TypeScript** `app.config.ts` that:
  - imports `dotenv`, `node:fs`, `node:path`, and the `ExpoConfig` type
  - reads a JSON file from the sibling workspace package (`../common/lib/version.json`)
  - uses TS-only syntax: type annotations with generics, `as` casts, `as const`, `@ts-expect-error`
- `packages/common` — sibling workspace package, depended on by mobile via `workspace:^`
- `typescript` is a devDependency at the monorepo root **and** in `packages/mobile`
- The workflow lives at `packages/mobile/.eas/workflows/create-staging-build.yml`
  (the EAS GitHub integration's base directory is `packages/mobile`)

Notes on fidelity:

- Our original `app.config.ts` imported the JSON with an import attribute
  (`import versionJson from "../common/lib/version.json" with { type: "json" }`).
  We replaced it with `fs.readFileSync` (see comment in `app.config.ts`) at support's
  suggestion — the workflow builds fail identically either way.
- Our production workflow uses `environment: staging` and gates builds behind
  `get-build` jobs; this repro uses `environment: preview` and unconditional builds
  to stay minimal. The failure is in the build jobs' "Read app config" step either way.

## Steps to reproduce

1. `nvm use && pnpm install` at the repo root.
2. Point the project at an EAS project you own:
   - in `packages/mobile/app.config.ts`, set `extra.eas.projectId` and the `updates.url`
     (or remove `updates` entirely), and add an `owner` field if needed.
3. Sanity checks that all pass:
   - `cd packages/mobile && npx expo config` — evaluates fine on Node 24 **and** Node 20.
   - `eas build --profile staging --platform android` from `packages/mobile` —
     the "Read app config" step succeeds.
4. Reproduce the failure:
   - `eas workflow:run .eas/workflows/create-staging-build.yml` from `packages/mobile`
     (or connect the repo to GitHub in the EAS dashboard with base directory
     `packages/mobile` and push to `main`).
   - The `fingerprint` job passes; the `build_android` / `build_ios` jobs fail at
     "Read app config" with `Unexpected token '{'`.
