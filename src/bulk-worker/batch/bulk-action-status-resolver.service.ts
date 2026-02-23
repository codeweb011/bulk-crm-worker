import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BulkBatch, BulkBatchStatus } from "../entities/bulk-action-batch.entity";
import { BulkAction } from "../entities/bulk-action.entity";
import { ActionStatus } from "../enums/action-status.enum";

@Injectable()
export class BulkActionStatusResolverService {

    constructor(
        @InjectRepository(BulkBatch)
        private readonly batchRepo: Repository<BulkBatch>,

        @InjectRepository(BulkAction)
        private readonly actionRepo: Repository<BulkAction>,
    ) { }

    async resolve(bulkActionId: string) {

        const totalBatches = await this.batchRepo.count({
            where: { bulkActionId },
        });

        const completedBatches = await this.batchRepo.count({
            where: {
                bulkActionId,
                status: BulkBatchStatus.COMPLETED,
            },
        });

        const failedBatches = await this.batchRepo.count({
            where: {
                bulkActionId,
                status: BulkBatchStatus.FAILED,
            },
        });

        // If any permanently failed batch
        if (failedBatches > 0) {
            await this.actionRepo.update(
                { id: bulkActionId },
                { status: ActionStatus.FAILED },
            );
            return;
        }

        // If all completed
        if (completedBatches === totalBatches && totalBatches > 0) {
            await this.actionRepo
                .createQueryBuilder()
                .update()
                .set({
                    status: ActionStatus.COMPLETED,
                    completedAt: () => 'NOW()',
                    totalDurationMs: () =>
                        `EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000`,
                })
                .where('id = :id', { id: bulkActionId })
                .andWhere('status = :processing', {
                    processing: ActionStatus.PROCESSING,
                })
                .execute();
            return;
        }

        // Otherwise still processing
        await this.actionRepo.update(
            { id: bulkActionId },
            { status: ActionStatus.PROCESSING },
        );
    }
}