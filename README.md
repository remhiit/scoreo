# Scoreo

Scoreo is a Progressive Web App (PWA) built with Kotlin/JS for tracking game results between friends.

## Repository structure

- `src/` — application source code
- `doc/functional/` — functional documentation (features, user flows)
- `doc/technical/` — technical documentation (architecture, design decisions)

## Running locally

### Prerequisites

- JDK 17+ (e.g. [BellSoft Liberica](https://bell-sw.com/) via [sdkman](https://sdkman.io/))
- Gradle 8.12+ (or use the `./gradlew` wrapper)

### Development build

```bash
./gradlew jsBrowserDevelopmentRun --continuous
```

Opens a dev server with hot reload at `http://localhost:9191`.

### Production build

```bash
./gradlew jsBrowserProductionWebpack
```

Output lands in `build/kotlin-webpack/js/productionExecutable/`. Copy assets and serve:

```bash
cp src/jsMain/resources/{index.html,styles.css} build/kotlin-webpack/js/productionExecutable/
cd build/kotlin-webpack/js/productionExecutable
python3 -m http.server 9191
```

Then open `http://localhost:9191`.

### Deployment

The site is automatically deployed on every push to `main`:

- **Codeberg Pages** via Forgejo Actions (`.forgejo/workflows/deploy.yml`) → `https://<username>.codeberg.page/Scoreo/`
- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`) → `https://<username>.github.io/Scoreo/`

> GitHub Pages: enable in *Settings → Pages → Source: GitHub Actions*.

### Run tests

```bash
./gradlew jvmTest
```

## Documentation

See [`doc/`](doc/) for detailed documentation — features, architecture, deployment, glossary.