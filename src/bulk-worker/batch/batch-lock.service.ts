import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { BulkBatch, BulkBatchStatus } from "../entities/bulk-action-batch.entity";


@Injectable()
export class BatchLockService {
    constructor(
        private readonly dataSource: DataSource,
    ) { }

    async lockNextBatch(workerId: string): Promise<BulkBatch | null> {
        return await this.dataSource.transaction(async (manager) => {

            const batch = await manager
                .createQueryBuilder(BulkBatch, 'batch')
                .setLock('pessimistic_write')
                .setOnLocked('skip_locked')
                .where('batch.status = :status', { status: BulkBatchStatus.PENDING })
                .andWhere('batch.retryCount < batch.maxRetries')
                .orderBy('batch.batch_number', 'ASC')
                .limit(1)
                .getOne();

            if (!batch) return null;

            batch.status = BulkBatchStatus.PROCESSING;
            batch.lockedBy = workerId;
            batch.lockedAt = new Date();
            batch.startedAt = new Date();

            await manager.save(batch);

            return await manager.findOne(BulkBatch, {
                where: { id: batch.id },
                relations: ['bulkAction'],
            });
        });
    }
}