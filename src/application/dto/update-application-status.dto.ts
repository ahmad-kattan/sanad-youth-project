import { IsEnum, IsIn } from 'class-validator';
import { ApplicationStatusdto } from './application-status-dto.js';

export class UpdateApplicationStatusDto {

  @IsEnum(ApplicationStatusdto)
  @IsIn([ApplicationStatusdto.ACCEPTED,ApplicationStatusdto.REJECTED])
  status: ApplicationStatusdto.ACCEPTED |
   ApplicationStatusdto.REJECTED ;
}