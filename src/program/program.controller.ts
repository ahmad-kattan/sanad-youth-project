import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { programMulterOptions } from './program.multer.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/Enums/index.js';
import { CurrentUser } from '../common/decorators/index.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { ProgramQueryDto } from './dto/program-query.dto.js';

@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

   
  @Post()
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles(UserRole.ADMIN,UserRole.SUPERVISOR)
  @UseInterceptors(FileInterceptor('image', programMulterOptions))
  create(@Body() dto: CreateProgramDto,@CurrentUser() currentUser: currentUserDto,
    @UploadedFile() file?: Express.Multer.File) 
  {
    return this.programService.create(dto, currentUser, file);
  }

   @Get()
  findAll(@Query() query: ProgramQueryDto) {
    return this.programService.findAll(query);
  }

   @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programService.findOne(id);
  }

   @Patch(':id')
   @UseGuards(JwtAuthGuard,RolesGuard)
   @Roles(UserRole.ADMIN,UserRole.SUPERVISOR)
   @UseInterceptors(FileInterceptor('image', programMulterOptions))
   update(@Param('id', ParseIntPipe) id: number,@CurrentUser() currentUser: currentUserDto,
    @Body() dto: UpdateProgramDto,
    @UploadedFile() file?: Express.Multer.File) {
    return this.programService.update(id, currentUser, dto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles(UserRole.ADMIN,UserRole.SUPERVISOR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: currentUserDto,
  ) {
    return this.programService.remove(id, currentUser);
  }


 
}
