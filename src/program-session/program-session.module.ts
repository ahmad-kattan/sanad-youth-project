import { Module } from '@nestjs/common';
import { ProgramSessionService } from './program-session.service.js';
import { ProgramSessionController } from './program-session.controller.js';

@Module({
  controllers: [ProgramSessionController],
  providers: [ProgramSessionService],
})
export class ProgramSessionModule {}
