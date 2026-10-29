import { IsEmail, IsLowercase, IsNotEmpty, IsString, IsSurrogatePair, IsUppercase, Matches, MaxLength, MinLength } from "class-validator";

export class CreateAuthDto {
    @IsString()
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
