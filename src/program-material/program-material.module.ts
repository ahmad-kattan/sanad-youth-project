import { Module } from '@nestjs/common';
import { ProgramMaterialService } from './program-material.service.js';
import { ProgramMaterialController } from './program-material.controller.js';

@Module({
  controllers: [ProgramMaterialController],
  providers: [ProgramMaterialService],
})
export class ProgramMaterialModule {}
