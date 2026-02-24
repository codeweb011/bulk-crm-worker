import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Contact, ContactStatus } from "./entities/contact.entity";

@Injectable()
export class ContactService {
    constructor(
        @InjectRepository(Contact)
        private readonly repo: Repository<Contact>,
    ) { }

    async fetchBatch(offset: number, limit: number, filter: any) {
        return this.repo.find({
            skip: offset,
            take: limit,
            order: { createdAt: 'ASC' },
            where: filter || {},
        });
    }

    async bulkUpdateStatus(ids: string[], status: ContactStatus) {
        await this.repo.update(
            { id: In(ids) },
            { status },
        );
    }

    async bulkUpdateStatusDetailed(ids: string[], status: ContactStatus) {
        const result = await this.repo
            .createQueryBuilder()
            .update(Contact)
            .set({ status })
            .where("id IN (:...ids)", { ids })
            .returning("id")
            .execute();

        const updatedIds = result.raw.map(r => r.id);
        const updatedSet = new Set(updatedIds);

        const failedIds = ids.filter(id => !updatedSet.has(id));

        return {
            successIds: updatedIds,
            failedIds,
            skippedIds: [],
        };
    }
}