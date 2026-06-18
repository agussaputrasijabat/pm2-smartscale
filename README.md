# pm2-smartscale [![npm version](https://badge.fury.io/js/pm2-smartscale.svg)](https://www.npmjs.com/package/pm2-smartscale)

> **Fork Notice**: This is a fork of [pm2-autoscale](https://github.com/VeXell/pm2-autoscale), originally created by **Viacheslav Volkov** ([VeXell](https://github.com/VeXell)). This fork is maintained by Agus Saputra Sijabat with modified scaling behavior. All credit for the original module goes to the original author.

PM2 module that helps dynamically scale applications based on utilization demand.

## Key Difference from Original

This fork changes the scaling policy to use the **average CPU utilization across an application's own instances** instead of triggering when any single instance exceeds the threshold. Each application is evaluated independently: the average is computed only over that app's workers, not across every instance running on the server.

| Behavior | Original (VeXell/pm2-autoscale) | This Fork |
|----------|--------------------------------|-----------|
| **Scale Out** | When **any single instance** of the app CPU ≥ threshold | When the **average CPU across the app's instances** ≥ threshold |
| **Scale In** | When **average CPU across the app's instances** < threshold | When the **average CPU across the app's instances** < threshold |

**Example**: A single app running 4 instances at CPU usage 90%, 70%, 85%, 75%:
- **Original**: Would scale because one instance (90%) exceeds threshold
- **This Fork**: Calculates that app's average = (90+70+85+75)/4 = **80%**, scales only if threshold ≤ 80%

## Motivation

By default, PM2 runs the application with a specified number of instances, which is not suitable when you have a few applications on one server with many CPUs, and you cannot predict which application will load your server. For example, if you have 48 CPUs and you run the application with `instances=max`, PM2 will run 48 instances, and every instance usually uses at least 100Mb of memory (~5GB for all instances). So, if you have 10 applications, it means you will use about 50GB of server memory without server load.

## Solution

The module helps dynamically increase application instances depending on CPU utilization of every application. You can run your application with the minimum required instances. When the module detects that an application's **average CPU utilization across its own instances** is higher than `scale_cpu_threshold`, it will start increasing that app's instances to a maximum of `CPUs-1` or `max_instances` (if set in the module config), provided that the server has available free memory. When the module detects that the app's CPU utilization is decreasing, it will stop the unnecessary instances.

## Install

```bash
pm2 install pm2-smartscale
```

## Uninstall

```bash
pm2 uninstall pm2-smartscale
```

## Module Configuration

Default settings:

-   `scale_cpu_threshold` Average CPU utilization across all application instances when the module will try to increase application instances. (default to `70`)
-   `release_cpu_threshold` Average CPU utilization across all application instances when the module will decrease application instances (default to `30`)
-   `ignore_apps` Global setting to skip app by name from the autoscale. You can enter multiple apps names separated by comma (default to "" - empty string)
-   `max_workers` The maximum number of application instances this module will
    spawn up to. If set to `0` or `max` - the maximum number of instance will be the total number of CPUs (default to `-1`)
-   `min_workers` The minimum number of application instances the module will keep
    when scaling down. The module never reduces an app below this floor, no matter
    how low the CPU usage is. This floor comes from config (not from the live PM2
    instance count), so it stays correct even after the module restarts while an
    app is already scaled up (default to `1`)
-   `min_seconds_to_add_worker` The minimum number of seconds between spawning new
    application instances if the load is high CPU utilization is high enough
    (defaults to `30`)
-   `min_seconds_to_release_worker` The minimum number of seconds between closing
    application instances if the CPU utilization is low enough (defaults to `180`)
-   `debug` Enable debug mode to show logs from the module (default to `false`)

To modify the module config values you can use the following commands:

```bash
pm2 set pm2-smartscale:debug true
pm2 set pm2-smartscale:scale_cpu_threshold 50
pm2 set pm2-smartscale:ignore_apps app1,app2
```

## Specific app configuration

If you want to configure specific settings for each of your apps, you can do it by changing the env variable, for example, in your ecosystem.config file.

Have a look at the example below:

```json
{
    "apps": [
        {
            "name": "testapp",
            "script": "build/app.js",
            "instances": "4",
            "autorestart": true,
            "watch": false,
            "max_memory_restart": "1024M",
            "vizion": false,
            "exec_mode": "cluster",
            "env": {
                "pm2_autoscale": {
                    "is_enabled": true,
                    "scale_cpu_threshold": 95,
                    "release_cpu_threshold": 50,
                    "min_workers": 2,
                    "max_workers": 5
                }
            }
        }
    ]
}
```

## Change log

### Version 2.1.1 (Fork)

-   **Fix flapping** (scale up immediately followed by scale down):
    -   A freshly added worker reports ~0% CPU on its first ticks and used to drag the
        app average below the release threshold right after a scale-up. Workers are now
        excluded from the scaling average until they have a few samples (warm-up). The
        scale-up decision still uses an honest all-workers average.
    -   Added an anti-flapping cooldown: the module will not scale an app down until
        `min_seconds_to_release_worker` has also passed since the last scale-**up**. This
        cooldown is not reset by worker restarts (`max_memory_restart`, crashes).
-   **Tuning note**: to avoid oscillation, keep `release_cpu_threshold` well below
    `scale_cpu_threshold`. Because removing a worker concentrates load onto the rest, a
    safe upper bound is roughly `release < scale_cpu_threshold / 2` at low worker counts.

### Version 2.1.0 (Fork)

-   **Fix**: Apps no longer get stuck scaled up. Previously the scale-down floor was
    derived from the live PM2 instance count captured when the internal app state was
    created. If that state was recreated while an app was already scaled up (e.g. the
    module restarted, or the app reloaded), the floor latched to the inflated count and
    scale-down never triggered even at near-zero CPU.
-   Add new config option `min_workers` (global and per-app). The scale-down floor now
    comes from this config instead of the mutable instance count, so it stays correct
    across restarts. Defaults to `1`; set it higher per app if you need a minimum number
    of always-on workers.

### Version 1.5.0 (Fork)

-   **Breaking Change**: Scaling policy now uses **average CPU utilization** across all instances instead of triggering on max (single instance) CPU
-   Scale out triggers when the average CPU of all instances exceeds `scale_cpu_threshold`
-   Scale in triggers when the average CPU of all instances falls below `release_cpu_threshold`
-   This provides more stable scaling behavior by considering the overall load rather than spikes from individual instances

### Version 1.4.0

-   Add new config option `max_workers`. The maximum number of application instances this module will
    spawn up to
-   Add new config option `min_seconds_to_add_worker`. The minimum number of seconds between spawning new
    application instances
-   Add new config option `min_seconds_to_release_worker`. The minimum number of seconds between closing
    application instances

All options are also available for app specific settings in the `ecosystem.config` file.

### Version 1.3.0

-   Add new config option `ignore_apps` exclude apps from autoscale
-   Add specific app configuration for `scale_cpu_threshold` and `release_cpu_threshold` in `env` section of your `ecosystem.config` file.
