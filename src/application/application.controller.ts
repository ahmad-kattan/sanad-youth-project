import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/Enums/index.js';
import { CurrentUser } from '../common/decorators/index.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { ApplicationQueryDto } from './dto/application-query.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { applicationMulterOptions } from './application.multer.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('application')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('cv', applicationMulterOptions))
  create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() currentUser: currentUserDto,
    @UploadedFile()file?:Express.Multer.File
  ) {
    return this.applicationService.create(dto, currentUser,file);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query() query: ApplicationQueryDto,
    @CurrentUser() currentUser: currentUserDto,
  ) {
    return this.applicationService.findAll(query, currentUser);
  }

  @Get("myapplications")
  @Roles(UserRole.STUDENT)
  findMyApplications(@CurrentUser() currentUser: currentUserDto)
  {
    return this.applicationService.findAllMyApplications(currentUser);
  }


  @Get('program/:programId/students')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findStudentsByProgram(@Param('programId', ParseIntPipe) programId: number,@CurrentUser() currentUser: currentUserDto) 
  {
    return this.applicationService.findStudentsByProgram(programId,currentUser);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STUDENT)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: currentUserDto,
  ) {
    return this.applicationService.findOne(id, currentUser);
  }

  
@Get(':id/status')
@Roles(UserRole.ADMIN, UserRole.STUDENT)
trackApplicationStatus(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() currentUser: currentUserDto,
) {
  return this.applicationService.trackApplicationStatus(
    id,
    currentUser,
  );
}

  @Patch(':id/cv')
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('cv', applicationMulterOptions))
  updateCv(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() currentUser: currentUserDto,
  @UploadedFile() file?: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('CV PDF file is required');
  }
  return this.applicationService.updateCv(id, file, currentUser);}


  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationStatusDto,
    @CurrentUser() currentUser: currentUserDto,
  ) {
    return this.applicationService.updateStatus(
      id,
      dto,
      currentUser,
    );
  }

  @Delete(':id')
  
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STUDENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: currentUserDto,
  ) {
    return this.applicationService.remove(id, currentUser);
  }
}
