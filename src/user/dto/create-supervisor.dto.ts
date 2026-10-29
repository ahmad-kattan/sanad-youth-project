import { IsEmail,  IsEnum,  IsLowercase, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
import { UserRole } from "../../common/Enums/index.js";

    export class CreateSupervisorDto {
    @IsEmail()
    @IsNotEmpty()
    email:string;

    @IsNotEmpty()
    @IsString()
    firstName:string;
    
    @IsNotEmpty()
    @IsString()
    lastName:string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(70)
    password: string;

    
    
}