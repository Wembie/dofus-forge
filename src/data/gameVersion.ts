// Split out of changelog.ts so eagerly-loaded code (the app header) doesn't
// pull in the entire CHANGELOG array (~28 KB) just to read one string.
// Without this split, Rollup hoists the whole shared changelog.ts module
// into the main bundle since BuilderPage imports from it eagerly, even
// though the actual CHANGELOG data is only ever needed inside the lazy
// ChangelogModal chunk.
export const DOFUS_GAME_VERSION = __DOFUS_VERSION__  // auto desde public/data/version.json
