import { Injectable } from "@nestjs/common";
import { BatchLockService } from "./batch-lock.service";
import { BatchExecutorService } from "./batch-executor.service";
import { Cron } from "@nestjs/schedule";


@Injectable()
export class BatchPollerService {

    private readonly workerId = `worker-${process.pid}`;

    constructor(
        private readonly batchLockService: BatchLockService,
        private readonly batchExecutor: BatchExecutorService,
    ) { }

    @Cron('*/5 * * * * *') // every 5 seconds
    async poll() {
        console.log(`[${this.workerId}] Polling for batch...`);

        const batch = await this.batchLockService.lockNextBatch(this.workerId);

        if (!batch) {
            console.log(`[${this.workerId}] No batch found`);
            return;
        };

        console.log(
            `[${this.workerId}] Locked batch ${batch.id}, executing...`,
        );

        await this.batchExecutor.execute(batch, this.workerId);
    }
}

// @Injectable()
// export class BatchPollerService {
//     private readonly workerId = `worker-${process.pid}`;
//     private isRunning = true;

//     constructor(
//         private readonly batchLockService: BatchLockService,
//         private readonly batchExecutor: BatchExecutorService,
//     ) { }

//     async onModuleInit() {
//         this.start();
//     }

//     private async start() {
//         let idleDelay = 100; // start small

//         while (this.isRunning) {
//             const batch = await this.batchLockService.lockNextBatch(this.workerId);

//             if (!batch) {
//                 await this.sleep(idleDelay);
//                 idleDelay = Math.min(idleDelay * 2, 5000); // exponential backoff
//                 continue;
//             }

//             idleDelay = 100; // reset backoff

//             await this.batchExecutor.execute(batch, this.workerId);
//         }
//     }

//     private sleep(ms: number) {
//         return new Promise((res) => setTimeout(res, ms));
//     }
// }