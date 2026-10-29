import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProgramSessionService } from './program-session.service.js';
import { CreateProgramSessionDto } from './dto/create-program-session.dto.js';
import { UpdateProgramSessionDto } from './dto/update-program-session.dto.js';
import { ProgramSessionQueryDto } from './dto/program-session-query.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../common/Enums/index.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/index.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';

@Controller('program-session')
export class ProgramSessionController {
  constructor(private readonly programSessionService: ProgramSessionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(
    @Body() dto: CreateProgramSessionDto,
    @CurrentUser() user: currentUserDto,
  ) {
    return this.programSessionService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: ProgramSessionQueryDto) {
    return this.programSessionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programSessionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgramSessionDto,
    @CurrentUser() user: currentUserDto,
  ) {
    return this.programSessionService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: currentUserDto,
  ) {
    return this.programSessionService.remove(id, user);
  }
}
