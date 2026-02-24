import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkBatch } from './entities/bulk-action-batch.entity';
import { BulkAction } from './entities/bulk-action.entity';
import { ActionExecutorService } from './action-executor/action-executor.service';
import { ContactUpdateStatusHandler } from './action-executor/handlers/contact-update-status.handler';
import { ContactService } from './domain/contact.service';
import { Contact } from './domain/entities/contact.entity';
import { BatchPollerService } from './batch/batch-poller.service';
import { BatchLockService } from './batch/batch-lock.service';
import { BatchExecutorService } from './batch/batch-executor.service';
import { BulkActionStatusResolverService } from './batch/bulk-action-status-resolver.service';
import { BulkActionLog } from './entities/bulk-action-logs.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([BulkBatch, BulkAction, Contact, BulkActionLog]),
        ScheduleModule.forRoot(),
    ],
    providers: [
        BatchPollerService,
        BatchLockService,
        BatchExecutorService,
        ActionExecutorService,
        ContactUpdateStatusHandler,
        ContactService,
        BulkActionStatusResolverService,
        {
            provide: 'BULK_ACTION_HANDLERS',
            useFactory: (
                contactUpdateStatusHandler: ContactUpdateStatusHandler,
            ) => [
                    contactUpdateStatusHandler,
                ],
            inject: [ContactUpdateStatusHandler],
        },
    ],
})
export class BulkWorkerModule { }