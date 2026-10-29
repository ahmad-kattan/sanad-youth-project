import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProgramMaterialDto } from './create-program-material.dto.js';

export class UpdateProgramMaterialDto extends PartialType(
    OmitType(CreateProgramMaterialDto,['programId'] as const)) {}
