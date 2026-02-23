import { BulkBatch } from '../../entities/bulk-action-batch.entity';
import { ActionType } from '../../enums/action-type.enum';

export interface BulkActionHandler {

    /**
     * Defines which action type this handler supports
     */
    supports(actionType: ActionType): boolean;

    /**
     * Executes the business logic for a batch
     */
    execute(batch: BulkBatch): Promise<void>;
}