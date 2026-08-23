/**
 * The screen imports its stylesheet for its side effect, so the bundler ships
 * the CSS inside the module's chunk. This package has no Vite config of its own
 * — and therefore no `vite/client` types — so the import is declared here.
 */
declare module '*.css'
