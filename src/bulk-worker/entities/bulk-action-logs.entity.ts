import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

export enum BulkActionLogStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED',
}

@Entity({ name: 'bulk_action_logs' })
@Index(['bulkActionId'])
@Index(['bulkActionId', 'status'])
@Index(['createdAt'])
export class BulkActionLog {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'bulk_action_id' })
    bulkActionId: string;

    @Column({ name: 'entity_id' })
    entityId: string;

    @Column({
        type: 'enum',
        enum: BulkActionLogStatus,
    })
    status: BulkActionLogStatus;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}