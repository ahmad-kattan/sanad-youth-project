import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateApplicationDto {

    @Type(() => Number)
    @IsInt()
    @Min(1)
    programId:number;
}
