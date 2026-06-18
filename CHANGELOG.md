# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.3] - 2026-06-18

### Security

- Patch transitive CVEs pulled in by `pm2@7.0.1` via npm `overrides` (pm2 pins
  these exactly and has no fixed release yet):
  - `ws` 8.20.0 → **8.21.0**: fixes **CVE-2026-48779** (High, DoS via memory
    exhaustion from high-volume tiny WebSocket fragments) and **CVE-2026-45736**
    (Moderate, uninitialized memory disclosure via `close()` reason).
  - `js-yaml` 4.1.1 → **4.2.0**: fixes **CVE-2026-53550** (Moderate,
    quadratic-time DoS from repeated merge-key aliases).
  - `@pm2/js-api` kept on `ws` 7.5.11 (already patched) to avoid a needless major
    bump.
- `npm audit`: 0 vulnerabilities.

## [2.1.2] - 2026-06-18

### Fixed

- Harden the daemon against crashes and anti-flap timer pollution:
  - Guard unchecked `pm2_env.axm_options` / `pm2_env.env` access in
    `isMonitoringApp` and `getPm2AutoscaleConfig` — a malformed/transient PM2
    process descriptor no longer throws and crashes the module.
  - Validate that parsed `pm2_autoscale` env config is a plain object before use
    (a literal `null` previously crashed on `appConfig.is_enabled`).
  - Add `try/catch` backstops inside the `pm2.list` / `pidusage` / debug-stats
    callbacks, plus top-level `uncaughtException` / `unhandledRejection`
    handlers.
  - Seed every `reduce()` with an initial value and guard empty arrays
    (empty-array reduce crashed the debug stats interval).
  - Stop worker restart / pid churn from resetting the scale-up and scale-down
    cooldowns (`updatePid` and `removeNotActivePids` no longer stamp the
    anti-flap timers).
  - Handle the `pm2.scale` error argument instead of swallowing it, and add a
    watchdog timeout so a never-firing scale callback can no longer permanently
    freeze an app's autoscaling (`isProcessing` lock).

### Changed

- `@types/pm2.d.ts`: mark `axm_options` / `env` optional to match the real PM2
  runtime, and widen the `scale` callback signature to `(err?, result?)`.

## [2.1.1] - 2026-06-18

### Fixed

- Prevent scale up/down flapping by introducing a dedicated scale-up timestamp
  so worker restarts (crashes, `max_memory_restart`) do not suppress legitimate
  scale-downs.

## [2.1.0] - 2026-06-18

### Added

- Per-app configuration overrides via the `pm2_autoscale` environment variable
  (thresholds, worker bounds, cooldowns, enable/disable per app).

## [2.0.1] - 2026-06-18

### Documentation

- Clarify that CPU/memory averaging is per-app, not server-wide.

## [2.0.0] - 2026-06-18

### Changed

- Rebrand to `pm2-smartscale` and switch scaling decisions to average CPU
  utilization.
- Upgrade core dependencies: pm2 7, pmx 1.6, pidusage 4, TypeScript 6.
- Emit compiled output to `dist/` instead of the project root.

### Added

- MIT license.

[2.1.3]: https://github.com/agussaputrasijabat/pm2-smartscale/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/agussaputrasijabat/pm2-smartscale/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/agussaputrasijabat/pm2-smartscale/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/agussaputrasijabat/pm2-smartscale/compare/v2.0.0...v2.1.0
[2.0.1]: https://github.com/agussaputrasijabat/pm2-smartscale/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/agussaputrasijabat/pm2-smartscale/releases/tag/v2.0.0
