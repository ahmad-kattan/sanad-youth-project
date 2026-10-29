import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service.js';
import { ApplicationController } from './application.controller.js';

@Module({
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
