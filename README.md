# Scoreo

Scoreo is a Progressive Web App (PWA) built with Kotlin/JS for tracking game results between friends.

## Repository structure

- `src/` — application source code
- `doc/functional/` — functional documentation (features, user flows)
- `doc/technical/` — technical documentation (architecture, design decisions)

## Running locally

### Prerequisites

- JDK 17+ (e.g. [BellSoft Liberica](https://bell-sw.com/) via [sdkman](https://sdkman.io/))
- Gradle 8.12+ (or use the `gradlew` wrapper)

### Development build

```bash
gradle jsBrowserDevelopmentRun --continuous
```

Opens a dev server with hot reload at `http://localhost:9191`.

### Production build

```bash
gradle jsBrowserProductionWebpack
```

Output lands in `build/kotlin-webpack/js/productionExecutable/`. Copy assets and serve:

```bash
cp src/jsMain/resources/{index.html,styles.css} build/kotlin-webpack/js/productionExecutable/
cd build/kotlin-webpack/js/productionExecutable
python3 -m http.server 9191
```

Then open `http://localhost:9191`.

### Deployment

The site is automatically deployed to **Codeberg Pages** on every push to `main` via Forgejo Actions (`.forgejo/workflows/deploy.yml`).

The published URL is: `https://<username>.codeberg.page/Scoreo/`

> To enable: activate Actions in *Settings → Units → Overview* and ensure a runner is available.

### Run tests

```bash
gradle jvmTest
```

## Documentation

See the [`doc/`](doc/) directory for detailed documentation.