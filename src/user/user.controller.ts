import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Put, Query } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserRole } from '../common/Enums/index.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/index.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { currentUserDto } from './dto/currentUserDto.js';
import { CreateSupervisorDto } from './dto/create-supervisor.dto.js';
import { UserQueryDto } from './dto/user-query-dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMIN) 
  @Get('students')
  async getAllStudents(@Query() query: UserQueryDto) {
    return this.userService.findAllStudents(query);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async getAll(@Query() query: UserQueryDto)
  {
    return this.userService.findAll(query)
  }

  @Roles(UserRole.ADMIN,UserRole.STUDENT,UserRole.SUPERVISOR)
  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: number,@CurrentUser() user :currentUserDto) {
    return this.userService.findOne(id,user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createSuperVisor(@Body() createUserdto:CreateSupervisorDto)
  {
    return this.userService.createSupervisor(createUserdto);
  }

  

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR,UserRole.STUDENT)
  updateUser(@Param('id',ParseIntPipe) id: number, @Body() data: UpdateUserDto,
  @CurrentUser() user :currentUserDto) {
    return this.userService.updateuser(id, data,user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR,UserRole.STUDENT)
  remove(@Param('id',ParseIntPipe) id: number,@CurrentUser() user :currentUserDto) {
    return this.userService.remove(id,user);
    
  }
}
