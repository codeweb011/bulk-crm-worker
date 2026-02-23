import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BulkWorkerModule } from './bulk-worker/bulk-worker.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'admin123',
      database: 'bulk-action-db',
      autoLoadEntities: true,
      synchronize: true, // dev only
    }),
    BulkWorkerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
