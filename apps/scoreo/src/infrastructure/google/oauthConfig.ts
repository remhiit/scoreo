/**
 * Equivalent of the Gradle `generateOAuthConfig` task that wrote a generated
 * `OAuthConfig.kt` from the `GOOGLE_CLIENT_ID` env var. Vite injects build-time env
 * vars natively via `import.meta.env`, so no source-generation step is needed here.
 */
export const OAUTH_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
