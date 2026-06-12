// Stand-in for the shared code our mobile app imports from this package at
// runtime. The app config only reads version.json from this package, but the
// workspace dependency from mobile -> common is part of the real setup.
export const COMMON_PACKAGE = "@repro/common";
