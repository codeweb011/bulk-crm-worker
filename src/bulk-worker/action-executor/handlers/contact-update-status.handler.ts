import { Injectable } from '@nestjs/common';
import { BulkActionHandler } from '../interfaces/bulk-action-handler.interface';
import { ActionType } from 'src/bulk-worker/enums/action-type.enum';
import { BulkBatch } from 'src/bulk-worker/entities/bulk-action-batch.entity';
import { ContactService } from 'src/bulk-worker/domain/contact.service';


@Injectable()
export class ContactUpdateStatusHandler implements BulkActionHandler {

    constructor(
        private readonly contactService: ContactService,
    ) { }

    supports(actionType: ActionType): boolean {
        return actionType === ActionType.UPDATE_STATUS;
    }

    async execute(batch: BulkBatch): Promise<void> {

        // const { offset, limit } = batch;
        const { status } = batch.bulkAction.payload;

        console.log('Executing batch:', batch.batchNumber);

        // // 1️⃣ Fetch records for this batch
        // const contacts = await this.contactService.fetchBatch(offset, limit, batch.bulkAction.filters);

        // if (!contacts.length) {
        //     batch.totalRecords = 0;
        //     batch.processedRecords = 0;
        //     return;
        // }

        // const ids = contacts.map(c => c.id);

        // 2️⃣ Perform bulk update
        await this.contactService.bulkUpdateStatus(batch.ids, status);

        // 3️⃣ Update metrics
        batch.totalRecords = batch.ids.length;
        batch.processedRecords = batch.ids.length;
        batch.failedRecords = 0;
    }
}