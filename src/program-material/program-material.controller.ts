import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Query, ParseIntPipe, Res } from '@nestjs/common';
import { ProgramMaterialService } from './program-material.service.js';
import { CreateProgramMaterialDto } from './dto/create-program-material.dto.js';
import { UpdateProgramMaterialDto } from './dto/update-program-material.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/Enums/index.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { programMaterialMulterOptions } from './program-material.multer.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/index.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import express from 'express';

@Controller('program-material')
@UseGuards(JwtAuthGuard,RolesGuard)
export class ProgramMaterialController {
  constructor(private readonly programMaterialService: ProgramMaterialService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Post()
  @UseInterceptors(FileInterceptor('file', programMaterialMulterOptions))
  create(@Body() dto: CreateProgramMaterialDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: currentUserDto,
  ) {
    return this.programMaterialService.create(dto, user, file);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR,UserRole.STUDENT)
  @Get()
  findAll( @Query('programId') programId: string | undefined,
  @CurrentUser() user: currentUserDto)
   {
    const parsedProgramId =
      programId === undefined ? undefined : Number(programId);

    if (
      parsedProgramId !== undefined &&
      (!Number.isInteger(parsedProgramId) || parsedProgramId < 1)
    ) {
      throw new Error('programId must be a positive integer');
    }

    return this.programMaterialService.findAll(parsedProgramId,user);
  }

    
  @Get(':id/file')
  async downloadFile(@Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: currentUserDto, @Res() response: express.Response)
  {
    const file = await this.programMaterialService.getFile(id, user);

    return response.download(file.fullPath, file.filename);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR,UserRole.STUDENT)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number,@CurrentUser() user: currentUserDto)
  {
    return this.programMaterialService.findOne(id, user);
  
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', programMaterialMulterOptions))
  update(@Param('id', ParseIntPipe) id: number,@Body() dto: UpdateProgramMaterialDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: currentUserDto,
  ) {
    return this.programMaterialService.update(id, dto, user, file);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserDto,
  ) {
    return this.programMaterialService.remove(id, user);
  }
}
