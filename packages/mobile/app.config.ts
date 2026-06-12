import dotenv from "dotenv";
import type { ExpoConfig } from "expo/config";
import fs from "node:fs";
import path from "node:path";

// Read MOBILE_APP_VERSION from a JSON single source of truth that lives in a
// sibling workspace package. Originally this was an import attribute, which
// fails the same way on EAS Workflows builds:
// import versionJson from "../common/lib/version.json" with { type: "json" }
const versionJson = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../common/lib/version.json"),
    "utf8",
  ),
) as { MOBILE_APP_VERSION: string };
const MOBILE_APP_VERSION = versionJson.MOBILE_APP_VERSION;

dotenv.config({ quiet: true });

// We include config for several backend environments in the app so it can
// switch between them without a rebuild. Env vars come from a .env file
// locally and from EAS environment variables on builds.
const defaultAppEnv = process.env.APP_ENV ?? "development";
const phConfig: Record<string, Record<string, string>> = {};

const environments =
  defaultAppEnv === "development"
    ? ["development", "qa", "staging"]
    : ["qa", "staging", "production"];

environments.forEach((env) => {
  const prefix = env.toUpperCase() + "_";

  phConfig[env] = {
    // The real config reads ~10 keys per environment this way. Placeholder
    // fallbacks keep this repro runnable without any secrets configured.
    exampleApiKey: String(
      process.env[`${prefix}EXAMPLE_API_KEY`] ?? "placeholder",
    ),
  };
});

const config: ExpoConfig = {
  name: "EAS Workflows Repro",
  slug: "eas-workflows-repro",
  version: MOBILE_APP_VERSION,
  orientation: "portrait",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  // Removed from the ExpoConfig type in SDK 55, but kept at runtime so libraries
  // that introspect the config can still detect New Architecture is enabled.
  // @ts-expect-error - field removed from types; still honored at runtime
  newArchEnabled: true,

  extra: {
    eas: {
      projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
    },
    gitCommit: process.env.EAS_BUILD_GIT_COMMIT_HASH ?? "undefined",
    defaultAppEnv,
    environments,
    phConfig,
  },

  ios: {
    bundleIdentifier: "com.example.easworkflowsrepro",
    supportsTablet: true,
  },

  android: {
    package: "com.example.easworkflowsrepro",
    intentFilters: [
      // The real config builds intent filters for several hosts with an
      // `as const` array, so we keep that TypeScript construct here.
      ...(["www.example.com", "staging.example.com"] as const).map((host) => ({
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host, path: "/" },
          { scheme: "https", host, pathPrefix: "/sessions" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      })),
    ],
  },

  updates: {
    url: "https://u.expo.dev/REPLACE_WITH_YOUR_PROJECT_ID",
  },

  runtimeVersion: {
    policy: "appVersion",
  },
};

export default config;
