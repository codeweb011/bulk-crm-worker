import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BulkBatch, BulkBatchStatus } from "../entities/bulk-action-batch.entity";
import { Repository } from "typeorm";
import { ActionExecutorService } from "../action-executor/action-executor.service";
import { BulkAction } from "../entities/bulk-action.entity";
import { BulkActionStatusResolverService } from "./bulk-action-status-resolver.service";
import { ActionStatus } from "../enums/action-status.enum";
import { BulkActionLog, BulkActionLogStatus } from "../entities/bulk-action-logs.entity";


@Injectable()
export class BatchExecutorService {

    constructor(
        private readonly actionExecutor: ActionExecutorService,

        private readonly statusResolver: BulkActionStatusResolverService,

        @InjectRepository(BulkBatch)
        private readonly batchRepo: Repository<BulkBatch>,

        @InjectRepository(BulkAction)
        private readonly actionRepo: Repository<BulkAction>,

        @InjectRepository(BulkActionLog)
        private readonly logRepo: Repository<BulkActionLog>,
    ) { }

    async execute(batch: BulkBatch, workerId: string) {

        try {

            await this.markActionStarted(batch.bulkActionId);

            const result = await this.actionExecutor.execute(batch);

            // 1️⃣ Create logs
            const logs = [
                ...result.successIds.map(id => ({
                    bulkActionId: batch.bulkActionId,
                    entityId: id,
                    status: BulkActionLogStatus.SUCCESS,
                })),
                ...result.failedIds.map(id => ({
                    bulkActionId: batch.bulkActionId,
                    entityId: id,
                    status: BulkActionLogStatus.FAILED,
                    errorMessage: 'Update failed',
                })),
                ...result.skippedIds.map(id => ({
                    bulkActionId: batch.bulkActionId,
                    entityId: id,
                    status: BulkActionLogStatus.SKIPPED,
                })),
            ];

            if (logs.length) {
                await this.logRepo.insert(logs);
            }

            // 2️⃣ Update batch metrics
            batch.totalRecords = batch.ids.length;
            batch.processedRecords =
                result.successIds.length +
                result.failedIds.length +
                result.skippedIds.length;

            batch.failedRecords = result.failedIds.length;
            batch.status = BulkBatchStatus.COMPLETED;
            batch.completedAt = new Date();
            batch.errorMessage = '';

            await this.batchRepo.save(batch);

            // 3️⃣ Update action counters
            await this.actionRepo.increment(
                { id: batch.bulkActionId },
                'processedRecords',
                batch.processedRecords,
            );

            await this.actionRepo.increment(
                { id: batch.bulkActionId },
                'failedRecords',
                batch.failedRecords,
            );

            await this.statusResolver.resolve(batch.bulkActionId);

        } catch (error) {

            batch.retryCount += 1;
            batch.errorMessage = error.message;

            batch.status =
                batch.retryCount >= batch.maxRetries
                    ? BulkBatchStatus.FAILED
                    : BulkBatchStatus.PENDING;

            await this.batchRepo.save(batch);

            await this.statusResolver.resolve(batch.bulkActionId);
        }
    }

    private async markActionStarted(bulkActionId: string) {
        await this.actionRepo
            .createQueryBuilder()
            .update()
            .set({
                startedAt: () => `COALESCE(started_at, NOW())`,
                status: ActionStatus.PROCESSING,
            })
            .where('id = :id', { id: bulkActionId })
            .execute();
    }
}