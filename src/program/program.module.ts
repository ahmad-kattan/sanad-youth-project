import { Module } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import { ProgramController } from './program.controller.js';

@Module({
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramModule {}
