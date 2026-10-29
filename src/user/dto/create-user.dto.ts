import {IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    firstName:string;
    @IsNotEmpty()
    @IsString()
    lastName:string; 
}
