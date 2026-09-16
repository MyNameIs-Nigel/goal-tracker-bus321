// Vitest runs outside Next.js's bundler, which is what actually enforces the
// "server-only" package's client/server boundary (via the `react-server`
// export condition). Tests run in a single Node/jsdom process regardless, so
// this shim makes `import "server-only"` a no-op instead of the hard throw
// the real package uses — see vitest.config.mts's alias.
export {};
