/**
 * The screen imports its stylesheet for its side effect, so the bundler ships
 * the CSS inside the module chunk. This package no longer has a Vite config of
 * its own — and therefore no `vite/client` types — so the import is declared here.
 */
declare module '*.css'
