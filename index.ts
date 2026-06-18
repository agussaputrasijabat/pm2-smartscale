// @ts-ignore
import pmx from 'pmx';

import { startPm2Connect } from './core/pm2';
import { initLogger, getLogger } from './utils/logger';

// Last-resort backstop: keep the long-running module alive if any unexpected
// error escapes the async PM2/pidusage callbacks instead of crash-looping.
process.on('uncaughtException', (error) => {
    getLogger().error(`Uncaught exception: ${error?.stack || error}`);
});

process.on('unhandledRejection', (reason) => {
    getLogger().error(
        `Unhandled rejection: ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`
    );
});

pmx.initModule(
    {
        widget: {
            el: {
                probes: true,
                actions: true,
            },

            block: {
                actions: false,
                issues: true,
                meta: true,
            },
        },
    },
    function (err: any, conf: IPMXConfig) {
        if (err) return console.error(err.stack || err);

        const moduleConfig = conf.module_conf;

        initLogger({ isDebug: moduleConfig.debug });
        startPm2Connect(moduleConfig);

        pmx.configureModule({
            human_info: [
                ['Status', 'Module enabled'],
                ['Debug', moduleConfig.debug ? 'Enabled' : 'Disabled'],
            ],
        });
    }
);
