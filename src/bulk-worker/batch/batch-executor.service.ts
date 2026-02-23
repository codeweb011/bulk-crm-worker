import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BulkBatch, BulkBatchStatus } from "../entities/bulk-action-batch.entity";
import { Repository } from "typeorm";
import { ActionExecutorService } from "../action-executor/action-executor.service";
import { BulkAction } from "../entities/bulk-action.entity";
import { BulkActionStatusResolverService } from "./bulk-action-status-resolver.service";
import { ActionStatus } from "../enums/action-status.enum";


@Injectable()
export class BatchExecutorService {

    constructor(
        private readonly actionExecutor: ActionExecutorService,

        private readonly statusResolver: BulkActionStatusResolverService,

        @InjectRepository(BulkBatch)
        private readonly batchRepo: Repository<BulkBatch>,

        @InjectRepository(BulkAction)
        private readonly actionRepo: Repository<BulkAction>,
    ) { }

    async execute(batch: BulkBatch, workerId: string) {
        try {
            await this.markActionStarted(batch.bulkActionId);

            await this.actionExecutor.execute(batch);

            batch.status = BulkBatchStatus.COMPLETED;
            batch.completedAt = new Date();
            batch.errorMessage = '';

            await this.batchRepo.save(batch);

            await this.actionRepo.increment(
                { id: batch.bulkActionId },
                'processedRecords',
                batch.processedRecords || 0,
            );

            await this.actionRepo.increment(
                { id: batch.bulkActionId },
                'failedRecords',
                batch.failedRecords || 0,
            );

            await this.statusResolver.resolve(batch.bulkActionId);
        } catch (error) {

            batch.retryCount += 1;
            batch.errorMessage = error.message;

            if (batch.retryCount >= batch.maxRetries) {
                batch.status = BulkBatchStatus.FAILED;
            } else {
                batch.status = BulkBatchStatus.PENDING;
            }

            await this.batchRepo.save(batch);

            if (batch.status === BulkBatchStatus.FAILED) {
                await this.actionRepo.increment(
                    { id: batch.bulkActionId },
                    'failedRecords',
                    batch.totalRecords || 0,
                );
            }

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