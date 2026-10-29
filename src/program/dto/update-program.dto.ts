import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProgramDto } from './create-program.dto.js';

export class UpdateProgramDto extends PartialType(
    OmitType(CreateProgramDto,['supervisorId']as const)
) {}
