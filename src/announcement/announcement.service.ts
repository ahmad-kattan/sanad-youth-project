import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { UserRole } from '../common/Enums/index.js';
import { ApplicationStatusdto } from '../application/dto/application-status-dto.js';
import { AnnouncementQueryDto } from './dto/announcement-query.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma:PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache ,
  ){}

  async create(dto: CreateAnnouncementDto,user: currentUserDto)
  {
    let programId = dto.programId;

    if (programId !== undefined && programId !== null) {
      await this.checkProgramAccess(programId, user);
    } 
    
    else if (!this.isAdmin(user) && programId ===undefined ) {
      throw new ForbiddenException(
        'Only admins can create general announcements',
      );
    }

    const isPublished = dto.isPublished ?? false;

    const newannouncement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        programId: programId ?? null,
        authorId: user.userId,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });
    await this.cache.clear();

    return newannouncement;

  }

 async findAll(user: currentUserDto, query: AnnouncementQueryDto) {
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isPublished,
  } = query;

  let accessWhere: Prisma.AnnouncementWhereInput = {};

  if (this.isAdmin(user)) {
    accessWhere = {};
  } 
  else if (user.role === UserRole.SUPERVISOR) {
    accessWhere = {
      OR: [
        {
          programId: null,
          isPublished: true,
        },
        {
          program: {
            supervisorId: user.userId,
          },
        },
      ],
    };
  } else if (user.role === UserRole.STUDENT) {
    accessWhere = {
      isPublished: true,
      OR: [
        { programId: null },
        {
          program: {
            applications: {
              some: {
                studentId: user.userId,
                status: ApplicationStatusdto.ACCEPTED,
              },
            },
          },
        },
      ],
    };
  } else {
    throw new ForbiddenException('You cannot view announcements');
  }

  const normalizedSearch = search?.trim() ?? '';

  const cacheKey = `announcements:list:${JSON.stringify({
    role: user.role,
    userId: user.userId,
    page,
    limit,
    search: normalizedSearch,
    sortBy,
    sortOrder,
    isPublished:user.role === UserRole.STUDENT ? undefined : isPublished,
  })}`;

  const cached = await this.cache.get<any>(cacheKey);

  if (cached !== undefined && cached !== null) {
    return cached;
  }

  const conditions: Prisma.AnnouncementWhereInput[] = [accessWhere];

  if (normalizedSearch) {
    conditions.push({
      OR: [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  if (isPublished !== undefined && user.role !== UserRole.STUDENT) {
    conditions.push({ isPublished });
  }

  const where: Prisma.AnnouncementWhereInput = {
    AND: conditions,
  };

  const skip = (page - 1) * limit;

  const [data, total] = await this.prisma.$transaction([
    this.prisma.announcement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    this.prisma.announcement.count({ where }),
  ]);

  const result = {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };

  await this.cache.set(cacheKey, result, 10_000);

  return result;
}

  async findOne(id: number, user: currentUserDto) {
  const key = `announcement:${id}`;

  let announcement = await this.cache.get<any>(key);

  if (announcement === undefined || announcement === null) {
    announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    await this.cache.set(key, announcement, 10_000);
  }

  if (this.isAdmin(user)) {
    return announcement;
  }

  if (announcement.programId === null) {
    if (announcement.isPublished) {
      return announcement;
    }

    throw new NotFoundException('Announcement not found');
  }

  if (
    user.role === UserRole.SUPERVISOR &&
    announcement.program?.supervisorId === user.userId
  ) {
    return announcement;
  }

  if (
    user.role === UserRole.STUDENT &&
    announcement.isPublished &&
    await this.checkStudentEnrollment(announcement.programId,user.userId)
  ) 
  {
    return announcement;
  }

  throw new NotFoundException('Announcement not found');
}

   async update(id: number,dto: UpdateAnnouncementDto,user: currentUserDto)
    {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (!this.isAdmin(user)) {
      if (user.role !== UserRole.SUPERVISOR ||
          announcement.programId === null ||
          announcement.authorId !== user.userId
      ) {
        throw new ForbiddenException(
          'You cannot update this announcement',
        );
      }

      await this.checkProgramAccess(announcement.programId, user);
    }

    const isPublished = dto.isPublished ?? announcement.isPublished;

    let publishedAt = announcement.publishedAt;

    if (dto.isPublished === true && !announcement.isPublished) {
      publishedAt = new Date();
    } 

    else if (dto.isPublished === false) {
      publishedAt = null;
    }


    const updateannouncement=await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        isPublished,
        publishedAt,
      },
    });
        
    await this.cache.del(`announcement:${id}`);

    return updateannouncement;
  }

  async remove(id: number, user: currentUserDto) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (!this.isAdmin(user)) {
      if (
        user.role !== UserRole.SUPERVISOR ||
        announcement.programId === null ||
        announcement.authorId !== user.userId
      ) {
        throw new ForbiddenException(
          'You cannot delete this announcement',
        );
      }

      await this.checkProgramAccess(announcement.programId, user);
    }

    const deleteannouncement=await this.prisma.announcement.delete({
      where: { id },
    });
    await this.cache.del(`announcement:${id}`);
 
    return deleteannouncement;

  }




   private isAdmin(user: currentUserDto): boolean {
    return user.role === UserRole.ADMIN;
  }

   private async checkProgramAccess(programId: number,user: currentUserDto)
  {
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (this.isAdmin(user)) {
      return program;
    }

    if (
      user.role === UserRole.SUPERVISOR &&
      program.supervisorId === user.userId
    ) {
      return program;
    }

    throw new ForbiddenException(
      'You cannot manage announcements for this program',
    );
  }

  private async checkStudentEnrollment(programId: number,userId: number): Promise<boolean> 
  {
    const application = await this.prisma.application.findFirst({
      where: {
        programId,
        studentId: userId,
        status: 'ACCEPTED',
      },
    });

    return !!application;
  }
}
