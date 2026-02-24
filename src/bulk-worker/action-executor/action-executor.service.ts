import { Injectable, Inject } from '@nestjs/common';
import { BulkActionHandler } from './interfaces/bulk-action-handler.interface';
import { ActionType } from '../enums/action-type.enum';
import { BulkBatch } from '../entities/bulk-action-batch.entity';

@Injectable()
export class ActionExecutorService {

    constructor(
        @Inject('BULK_ACTION_HANDLERS')
        private readonly handlers: BulkActionHandler[],
    ) { }

    async execute(batch: BulkBatch): Promise<{
        successIds: string[];
        failedIds: string[];
        skippedIds: string[];
    }> {

        const actionType: ActionType = batch.bulkAction.actionType;

        const handler = this.handlers.find(h =>
            h.supports(actionType),
        );

        if (!handler) {
            throw new Error(`No handler found for action type: ${actionType}`);
        }

        return await handler.execute(batch);
    }
}