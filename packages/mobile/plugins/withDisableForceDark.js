// Expo loads config plugins via `require()` at config-evaluation time, so this
// file must be CommonJS. ESM `import` syntax would require a TypeScript/ESM
// loader to be registered before Expo evaluates the config.
/* eslint-disable @typescript-eslint/no-require-imports */
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidStyles,
} = require("@expo/config-plugins")
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Expo config plugin that disables Android's Force Dark algorithm.
 *
 * Android 10+ automatically inverts colors for apps that don't provide a dark
 * theme. This causes TextInput text to render white-on-white when the system
 * is in dark mode. Setting `android:forceDarkAllowed` to `false` on the app
 * theme prevents this behavior.
 */
const withDisableForceDark = (config) => {
  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.assignStylesValue(
      config.modResults,
      {
        add: true,
        parent: AndroidConfig.Styles.getAppThemeGroup(),
        name: "android:forceDarkAllowed",
        value: "false",
      },
    )
    return config
  })
}

module.exports = createRunOncePlugin(
  withDisableForceDark,
  "with-disable-force-dark",
  "1.0.0",
)
