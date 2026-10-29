import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../common/Enums/index.js';
import { currentUserDto } from './dto/currentUserDto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateSupervisorDto } from './dto/create-supervisor.dto.js';
import { UserQueryDto } from './dto/user-query-dto.js';


@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  async findAll(query:UserQueryDto){
    const {page=1,limit=10,search,sortBy='id',sortOrder ='desc'}=query;
    const skip=(page-1)*limit;

     const where = search?{
      OR:[
        {firstName:{contains:search,mode:'insensitive' as const}},
        {lastName:{contains:search, mode: 'insensitive' as const}},
        {email:{contains:search, mode: 'insensitive' as const}}
      ]
    }:{};

    const [users, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({where,skip,take: limit,orderBy: {[sortBy]: sortOrder},
    omit:{password:true}}),
    this.prisma.user.count({where}),
  ]);

    return {
      data:users,
      meta:{
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
      }
    }
  }

  async findOne(id: number,currentUser:currentUserDto)
  {
    if (currentUser.role !== UserRole.ADMIN && currentUser.userId !==id)
    {
      throw new ForbiddenException('You are not authorized to access this resource');
    }

    const user= await this.prisma.user.findUnique({
      where: { id },omit:{password:true}
    });
    if (!user)
    {
      throw new NotFoundException('user not found')
    }

    return user;
  }

  async findAllStudents(query: UserQueryDto) {
    const {
    page = 1,
    limit = 10,
    search,
    sortBy = 'id',
    sortOrder = 'desc',
  } = query;

  const skip = (page - 1) * limit;

  const where = {
    role: UserRole.STUDENT,
    ...(search?{
      OR:[
        {firstName:{contains:search,mode:'insensitive' as const}},
        {lastName:{contains:search, mode: 'insensitive' as const}},
        {email:{contains:search, mode: 'insensitive' as const}}
      ]
    }:{}),
  };

  const [students, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      omit: { password: true },
    }),
    this.prisma.user.count({ where }),
  ]);

  return {
    data: students,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
  }

  async createSupervisor(createdto:CreateSupervisorDto)
  {
    return await this.authService.register(createdto,UserRole.SUPERVISOR);
  }

  async remove(id:number,currentUser:currentUserDto)
  {
    if (currentUser.role!== UserRole.ADMIN && currentUser.userId!==id)
    {
      throw new ForbiddenException('You are not authorized to access this resource');
    }
    
     await this.findOne(id,currentUser);
     await this.prisma.user.delete({where: {id}});

     return 'Deleted Successfully';
  }

  async updateuser(id: number, data: UpdateUserDto,currentUser:currentUserDto) {

    if (currentUser.role !== UserRole.ADMIN && currentUser.userId !== id) {
      throw new ForbiddenException('You are not authorized to access this resource');
    }
    await this.findOne(id,currentUser);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: data,
      omit:{password:true}
    }
  );
    return updatedUser;
  }
}

