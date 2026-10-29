import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProgramSessionDto } from './create-program-session.dto.js';

export class UpdateProgramSessionDto extends PartialType(
  OmitType(CreateProgramSessionDto, ['programId'] as const),
) {}