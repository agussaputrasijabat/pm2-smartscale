export type IPidDataInput = {
    id: number;
    pmId: number;
    memory: number;
    cpu: number;
};

type IPidData = {
    id: number;
    pmId: number;
    memory: number[];
    cpu: number[];
};

const MONIT_ITEMS_LIMIT = 30;

// A freshly added worker reports ~0% CPU on its first ticks. Excluding workers
// with fewer than this many samples from the scaling average prevents a new
// worker from dragging the average down right after a scale-up (which would
// otherwise trigger an immediate, wrong scale-down — flapping).
const MIN_CPU_SAMPLES_FOR_SCALING = 3;

export class App {
    private readonly pids: { [key: number]: IPidData } = {};
    private readonly name: string;
    private appConfig: IAppEnvConfig = {};

    private lastIncreaseWorkersTime: number = 0;
    private lastDecreaseWorkersTime: number = 0;
    // Set only by an intentional module scale-up (NOT by a pid restart), so the
    // anti-flap cooldown is not reset by max_memory_restart / crash restarts.
    private lastScaleUpTime: number = 0;

    public isProcessing: boolean = false;

    constructor(name: string) {
        this.name = name;
    }

    removeNotActivePids(activePids: number[]) {
        Object.keys(this.pids).forEach((pid) => {
            if (activePids.indexOf(Number(pid)) === -1) {
                delete this.pids[pid];
                this.updateLastDecreaseWorkersTime();
            }
        });

        return this;
    }

    updatePid(pidData: IPidDataInput) {
        const pid = pidData.id;

        if (!this.pids[pid]) {
            this.pids[pid] = {
                id: pid,
                pmId: pidData.pmId,
                memory: [pidData.memory],
                cpu: [pidData.cpu],
            };

            this.updateLastIncreaseWorkersTime();
        } else {
            const memoryValues = [pidData.memory, ...this.pids[pid].memory].slice(
                0,
                MONIT_ITEMS_LIMIT
            );
            const cpuValues = [pidData.cpu, ...this.pids[pid].cpu].slice(0, MONIT_ITEMS_LIMIT);

            this.pids[pid].memory = memoryValues;
            this.pids[pid].cpu = cpuValues;
        }

        return this;
    }

    updateLastIncreaseWorkersTime() {
        this.lastIncreaseWorkersTime = Number(new Date());
        return this;
    }

    updateLastDecreaseWorkersTime() {
        this.lastDecreaseWorkersTime = Number(new Date());
        return this;
    }

    updateLastScaleUpTime() {
        this.lastScaleUpTime = Number(new Date());
        return this;
    }

    getLastScaleUpTime() {
        return this.lastScaleUpTime;
    }

    getMonitValues() {
        return this.pids;
    }

    getCpuThreshold(): number[] {
        const cpuValues: number[] = [];

        for (const [, entry] of Object.entries(this.pids)) {
            const value = Math.round(
                entry.cpu.reduce((sum, value) => sum + value) / entry.cpu.length
            );
            cpuValues.push(value);
        }

        return cpuValues;
    }

    // Average CPU across the app's workers.
    //   - Scale-DOWN should pass the default (warm-up filter on): a worker just
    //     added by scale-up reads ~0% and would skew the average down, causing a
    //     wrong immediate scale-down. Cold workers are excluded.
    //   - Scale-UP should pass includeAll=true (honest average): counting the new
    //     worker's real load keeps the decision conservative and avoids cascading
    //     scale-ups before the worker is reflected in the average.
    getAverageCpuUsage(includeAll = false): number {
        const warmedUp: number[] = [];
        const all: number[] = [];

        for (const [, entry] of Object.entries(this.pids)) {
            const value = Math.round(
                entry.cpu.reduce((sum, value) => sum + value, 0) / entry.cpu.length
            );
            all.push(value);

            if (entry.cpu.length >= MIN_CPU_SAMPLES_FOR_SCALING) {
                warmedUp.push(value);
            }
        }

        // Fall back to all workers if none have warmed up yet (e.g. app startup),
        // so we never make a decision on an empty set.
        const cpuValues = includeAll || warmedUp.length === 0 ? all : warmedUp;
        if (cpuValues.length === 0) return 0;

        const total = cpuValues.reduce((sum, value) => sum + value, 0);
        return Math.round(total / cpuValues.length);
    }

    getAverageUsedMemory() {
        const memoryValues = this.getAveragePidsMemory();
        return Math.round(memoryValues.reduce((sum, value) => sum + value) / memoryValues.length);
    }

    getTotalUsedMemory() {
        const memoryValues: number[] = [];

        for (const [, entry] of Object.entries(this.pids)) {
            if (entry.memory[0]) {
                // Get the last memory value
                memoryValues.push(entry.memory[0]);
            }
        }
        return memoryValues.reduce((sum, value) => sum + value);
    }

    getLastIncreaseWorkersTime() {
        return this.lastIncreaseWorkersTime;
    }

    getLastDecreaseWorkersTime() {
        return this.lastDecreaseWorkersTime;
    }

    getName() {
        return this.name;
    }

    getActiveWorkersCount() {
        return Object.keys(this.pids).length;
    }

    getAppConfig() {
        return this.appConfig;
    }

    setAppConfig(appConfig: IAppEnvConfig) {
        this.appConfig = appConfig;
    }

    private getAveragePidsMemory() {
        const memoryValues: number[] = [];

        for (const [, entry] of Object.entries(this.pids)) {
            // Collect average memory for every pid
            const value = Math.round(
                entry.memory.reduce((sum, value) => sum + value) / entry.memory.length
            );
            memoryValues.push(value);
        }

        return memoryValues;
    }
}
