import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseService } from './database.service';
import { ScoresModule } from './scores/scores.module';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
class DatabaseModule {}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 45,  // 45 requests per 60s per IP
      },
    ]),
    DatabaseModule,
    ScoresModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
