import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { ProgramModule } from './program/program.module.js';
import { ApplicationModule } from './application/application.module.js';
import { ProgramSessionModule } from './program-session/program-session.module.js';
import { ProgramMaterialModule } from './program-material/program-material.module.js';
import { AnnouncementModule } from './announcement/announcement.module.js';
import { ThrottlerModule,ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
    isGlobal:true,
}),
    CacheModule.register({ isGlobal: true, ttl: 10_000 }), 
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]), 
    PrismaModule,
    UserModule,
    AuthModule,
    ProgramModule,
    ApplicationModule,
    ProgramSessionModule,
    ProgramMaterialModule,
    AnnouncementModule
  ],
  controllers:[],
  providers:[
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ] 
}
)

export class AppModule {}
