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
  - registers the **full production plugin list** (expo-notifications, expo-location,
    expo-camera, @stripe/stripe-react-native, @sentry/react-native, react-native-maps,
    expo-dev-client, a local `./plugins/withDisableForceDark.js`, etc.) — every plugin is
    `require()`'d during config evaluation
- `packages/mobile` carries the **full production dependency tree** (all `expo-*`,
  `react-native-*`, stream-chat, trpc client, reanimated, etc.) — see exclusions below
- `packages/common` — sibling workspace package, depended on by mobile via `workspace:^`
- composite **tsconfig project references** (root → common → mobile), mobile `tsconfig`
  extends `expo/tsconfig.base`
- root `metro.config.js`-style monorepo resolver in `packages/mobile/metro.config.js`
  (`watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup`)
- pnpm config at parity: `overrides`, `peerDependencyRules`, `onlyBuiltDependencies`,
  and `patchedDependencies` (expo-router, react-native-date-picker,
  stream-chat-react-native-core) under `patches/`
- `.npmrc` with `node-linker=hoisted`, `strict-peer-dependencies=true`, `auto-install-peers=true`
- Node 24 (`.nvmrc`, `engines.node >= 24`); `eas.json` pins `"node": "24.13.1"` / `"pnpm": "10.33.0"`
- `typescript` is a devDependency at the monorepo root **and** in `packages/mobile`
- The workflow lives at `packages/mobile/.eas/workflows/create-staging-build.yml`
  (the EAS GitHub integration's base directory is `packages/mobile`)

Notes on fidelity:

- **Could not reproduce.** With all of the above — including full dependency and plugin
  parity — `npx expo config --json --full --type public` (the exact command the failing
  build step runs) evaluates **successfully on both Node 24.13.1 and Node 20.19.0**, and
  the EAS Workflow build jobs do **not** fail at "Read app config." In our production app
  the same step fails with `Unexpected token '{'`.
- Two production deps are deliberately **excluded** because they can't transplant cleanly
  and are not part of config evaluation (`app.config.ts` does not import them):
  - `@fortawesome/pro-*` — private registry, requires an auth token
  - `@pickleheads/api`, `@pickleheads/db` — would pull the rest of the monorepo
  - `expo-constants` and `expo-font` were bumped one patch (55.0.15→55.0.16, 55.0.6→55.0.8)
    to satisfy `@expo/cli` peers on a fresh install (our production lockfile freezes the
    older pair).
- Our original `app.config.ts` imported the JSON with an import attribute
  (`import versionJson from "../common/lib/version.json" with { type: "json" }`).
  We replaced it with `fs.readFileSync` (see comment in `app.config.ts`) at support's
  suggestion — the workflow builds fail identically either way.
- Our production workflow uses `environment: staging` and gates builds behind
  `get-build` jobs; this repro uses `environment: preview` and unconditional builds.

Key open question for the Workflows team: in our production workflow the **`fingerprint`
job's "Read app config" step succeeds while the `build` jobs' identical step fails**, in the
same run on the same commit. A per-job difference can't come from repo code — it points to
the runtime each job's config-read harness uses. **What Node version and flags does the
build job's "Read app config" step run under, versus the fingerprint job?** We suspect the
build job evaluates the config under a Node where native TypeScript type-stripping is
expected but not enabled (e.g. ~22.6–23.5), diverging from the `24.13.1` pinned in `eas.json`.

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
