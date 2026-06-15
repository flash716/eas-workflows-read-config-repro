/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path")
const { getSentryExpoConfig } = require("@sentry/react-native/metro")
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config")

// Copied from https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
//
// This needs to be .js, not .ts, otherwise weird errors with expo-router will appear.

// Find the project and workspace directories
const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getSentryExpoConfig(projectRoot)

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot]
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]
// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true

module.exports = wrapWithReanimatedMetroConfig(config)
