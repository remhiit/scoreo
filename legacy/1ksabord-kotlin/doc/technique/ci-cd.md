# CI/CD — GitHub Actions

Fichier : `.github/workflows/deploy-pages.yml`

## Déclencheur

```yaml
on:
  push:
    branches: [main]
```

Le workflow s'exécute automatiquement à chaque push sur `main`.

## Workflow

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: kotlin
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: actions/configure-pages@v5
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew jsBrowserDistribution --no-daemon -q
      - uses: actions/upload-pages-artifact@v3
        with:
          path: kotlin/build/dist/js/productionExecutable

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Build

1. **Checkout** — clone le dépôt
2. **Setup Java** — JDK 17 (Temurin)
3. **Setup Gradle** — via `gradle/actions/setup-gradle@v4`
   (résout le wrapper jar manquant dans le CI)
4. **Build** — `./gradlew jsBrowserDistribution`
5. **Upload artifact** — le dossier de production est uploadé

### Deploy

- Déploie l'artefact vers **GitHub Pages**
- Nécessite les permissions `contents: read`, `pages: write`,
  `id-token: write`

## Activation

Dans les settings du dépôt GitHub :
**Settings → Pages → Source: GitHub Actions**.

-
