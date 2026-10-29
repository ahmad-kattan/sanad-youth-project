import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import { AnnouncementService } from './announcement.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { AnnouncementQueryDto } from './dto/announcement-query.dto.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/index.js';

import { UserRole } from '../common/Enums/index.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';

@Controller('announcement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
  ) {}

 
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@Body() dto: CreateAnnouncementDto,@CurrentUser() user: currentUserDto) 
  {
    return this.announcementService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN,UserRole.SUPERVISOR,UserRole.STUDENT)
  findAll(
    @CurrentUser() user: currentUserDto,
    @Query() query: AnnouncementQueryDto) 
    {
      return this.announcementService.findAll(user, query);
    }

  @Get(':id')
  @Roles(UserRole.ADMIN,UserRole.SUPERVISOR,UserRole.STUDENT)
  findOne(@Param('id', ParseIntPipe) id: number,@CurrentUser() user: currentUserDto) 
  {
    return this.announcementService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  update(@Param('id', ParseIntPipe) id: number,@Body() dto: UpdateAnnouncementDto,@CurrentUser() user: currentUserDto)
    {
    return this.announcementService.update(id, dto, user);
    }

 
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  remove(@Param('id', ParseIntPipe) id: number,@CurrentUser() user: currentUserDto)
     {
      return this.announcementService.remove(id, user);
     }
}
