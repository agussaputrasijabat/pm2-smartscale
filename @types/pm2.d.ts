import 'pm2';

declare module 'pm2' {
    export type Pm2Env = {
        // Optional to match the real PM2 runtime: these fields are absent on some
        // process descriptors (resurrect/dump, errored/launching/fork procs), so
        // accessing them unguarded can throw. Declaring them optional keeps the
        // shape honest even though strictNullChecks is currently off.
        axm_options?: {
            isModule?: boolean;
        };
        axm_actions: any;
        exec_mode: 'fork_mode' | 'cluster_mode';
        status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status';
        instances: number;
        env?: { pm2_autoscale?: string } & Record<string, string>;
    };

    export type ScaleAmount = number | `+${number}` | `-${number}`;
    // PM2 delivers failures as the first callback argument (e.g. 'App not found',
    // 'Same process number'); the previous `() => void` signature hid them.
    function scale(
        appName: string,
        process: ScaleAmount,
        callback: (err?: Error, result?: { success: boolean }) => void
    ): void;
}
