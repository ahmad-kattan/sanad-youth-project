import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProgramSessionDto } from './dto/create-program-session.dto.js';
import { UpdateProgramSessionDto } from './dto/update-program-session.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { UserRole } from '../common/Enums/index.js';
import { ProgramSessionQueryDto } from './dto/program-session-query.dto.js';

@Injectable()
export class ProgramSessionService {
  constructor(private readonly prisma:PrismaService
  ){}

  

   async create(dto: CreateProgramSessionDto,user: currentUserDto)
    {
      
    this.validateDates(dto.startsAt, dto.endsAt);

    await this.checkProgramPermission(dto.programId, user);

    return this.prisma.programSession.create({
      data: {
        programId: dto.programId,
        title: dto.title,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        location: dto.location?dto.location:null,
        meetingUrl: dto.meetingUrl?dto.meetingUrl:null,
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            supervisorId: true,
          },
        },
      },
    });
  }

   async findAll(query: ProgramSessionQueryDto) {
   const {page=1,limit=10,search,sortBy='startsAt',sortOrder ='desc'}=query;
    const where =  
          search? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                location: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}

    const [data, total] = await this.prisma.$transaction([
      this.prisma.programSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          program: {
            select: {
              id: true,
              title: true,
              supervisorId: true,
            },
          },
        },
      }),
      this.prisma.programSession.count({ where }),
    ]);

    return {
      data,
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

   async findOne(id: number) {
    const session = await this.prisma.programSession.findUnique({
      where: { id },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Program session not found');
    }

    return session;
  }

   async update(id: number,dto: UpdateProgramSessionDto,user: currentUserDto) {
    const session = await this.prisma.programSession.findUnique({
      where: { id },
      include: {
        program: {
          select: { supervisorId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Program session not found');
    }

    if (!this.isAdmin(user) &&session.program.supervisorId !== user.userId) 
      {
      throw new ForbiddenException(
        'You can manage sessions only for your own programs',
      );
    }

    const startsAt = dto.startsAt ?? session.startsAt;
    const endsAt = dto.endsAt ?? session.endsAt;

    this.validateDates(startsAt, endsAt);

    return this.prisma.programSession.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt,
        }),
        ...(dto.endsAt !== undefined && {
          endsAt: dto.endsAt,
        }),
        ...(dto.location !== undefined && {
          location: dto.location,
        }),
        ...(dto.meetingUrl !== undefined && {
          meetingUrl: dto.meetingUrl,
        }),
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            supervisorId: true,
          },
        },
      },
    });
  }

  async remove(id: number, user: currentUserDto) {
    const session = await this.prisma.programSession.findUnique({
      where: { id },
      include: {
        program: {
          select: { supervisorId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Program session not found');
    }

    if (
      !this.isAdmin(user) &&
      session.program.supervisorId !== user.userId
    ) {
      throw new ForbiddenException(
        'You can manage sessions only for your own programs',
      );
    }

    return this.prisma.programSession.delete({
      where: { id },
    });
  }


   private isAdmin(user: currentUserDto): boolean {
    return user.role === UserRole.ADMIN;
  }

   private async checkProgramPermission(programId: number,user: currentUserDto)
    {
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
      select: { id: true, supervisorId: true },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (!this.isAdmin(user) && program.supervisorId !== user.userId)
       {
      throw new ForbiddenException('You can manage sessions only for your own programs');
    }

    return program;
  }
  
  private validateDates(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) ||Number.isNaN(endsAt.getTime()))
    {
      throw new BadRequestException('Invalid session dates');
    }

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'endsAt must be later than startsAt',
      );
    }
  
  }



}
