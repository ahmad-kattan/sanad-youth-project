import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { basename, resolve } from 'path';
import { unlink } from 'fs/promises';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { UserRole } from '../common/Enums/index.js';
import { ProgramQueryDto } from './dto/program-query.dto.js';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma:PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache
  ){}
  
  async create(dto: CreateProgramDto,currentUser:currentUserDto,
    file?: Express.Multer.File) 
   {
    const imageUrl = this.getImageUrl(file);
    let supervisorId: number;
    try {
      if (currentUser.role === UserRole.ADMIN) {
        if (dto.supervisorId === undefined) {
      throw new BadRequestException(
        'Admin must provide supervisorId');
    }
    supervisorId = dto.supervisorId;
    }

    else if (currentUser.role === UserRole.SUPERVISOR) {
      if(dto.supervisorId !== undefined ) {
         throw new ForbiddenException(
        'supervisor cannot assign a course to another supervisor',
      );
      }
      supervisorId = currentUser.userId;
    }

    else {
    throw new ForbiddenException(
      'Only admins and supervisor can create courses',
    );
  }

      const supervisor = await this.prisma.user.findUnique({
        where: { id: supervisorId },
        select: {
          id: true,
          role: true,
        },
      });

      if (!supervisor || supervisor.role !== 'SUPERVISOR') {
        throw new BadRequestException(
          'The selected supervisor does not exist or is not a supervisor',
        );
      }
      const newcreate= await this.prisma.program.create({
        data: {
          title: dto.title,
          description: dto.description,
          capacity: dto.capacity,
          availableSeats: dto.capacity,
          supervisorId: supervisorId,
          imageUrl,
        },
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      await this.cache.clear();
      return newcreate;
    
    } 
    catch (error) {
        if (imageUrl) {
        await this.removeImage(imageUrl).catch(() => undefined);
      }
      throw error;
    }
  }

  async findAll(query: ProgramQueryDto) {
    const {page=1,limit=10,search,sortBy='createdAt',sortOrder='desc'} = query;

    const normalizedSearch = search?.trim() ?? '';
     const cacheKey = `programs:list:${JSON.stringify({
    page,
    limit,
    sortBy,
    sortOrder,
  })}`;

   const cached = await this.cache.get<any>(cacheKey);

  if (cached !== undefined && cached !== null) {
    return cached;
  }

    const skip = (page - 1) * limit;
    const where = normalizedSearch? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            {
              description: {contains: search,mode: 'insensitive' as const},
            },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({where,skip,take: limit,orderBy: {[sortBy]: sortOrder},
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.program.count({ where }),
    ]);

    const result = {
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
    await this.cache.set(cacheKey, result, 10_000);
    return result
  }

   async findOne(id: number) {
     
    const cacheKey = `program:${id}`;

    const cached = await this.cache.get<any>(cacheKey);

  
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }
     await this.cache.set(cacheKey, program, 10_000);

    return program;
  }


   async update(id: number,currentUser:currentUserDto,dto: UpdateProgramDto,file?: Express.Multer.File) 
   {
    const existingProgram = await this.prisma.program.findUnique({
      where: { id },
    });

    if (!existingProgram) {
      if (file) {
        await this.removeImage(this.getImageUrl(file)).catch(
          () => undefined,
        );
      }

      throw new NotFoundException('Program not found');
    }

     if(currentUser.role !== UserRole.ADMIN && currentUser.userId !== existingProgram.supervisorId)
    {
      throw new ForbiddenException('You are not authorized to update this Program');
    }


    const newImageUrl = this.getImageUrl(file);
    let updatedProgram;

    try {
      if (dto.capacity !== undefined) {
        const occupiedSeats =
        existingProgram.capacity - existingProgram.availableSeats;
        
        if (dto.capacity < occupiedSeats) {
    
          throw new BadRequestException
          (`Capacity cannot be less than occupied seats (${occupiedSeats})`,
    )}}

       updatedProgram = await this.prisma.program.update({
        where: { id },
        data: { 
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && {description: dto.description}),
          ...(dto.capacity !== undefined && {capacity: dto.capacity,
            // Keep already occupied seats occupied.
            availableSeats: dto.capacity - (existingProgram.capacity - existingProgram.availableSeats) 
           }),
          ...(newImageUrl && { imageUrl: newImageUrl }),
       },
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

    } catch (error) {
      // If updating fails, remove the newly uploaded image.
      if (newImageUrl) {
        await this.removeImage(newImageUrl).catch(() => undefined);
      }

      throw error;
    }

    if (newImageUrl && existingProgram.imageUrl) {
        await this.removeImage(existingProgram.imageUrl);
      }



      await this.cache.del(`program:${id}`);
      return updatedProgram;
    
  }
   async remove(id: number,currentUser:currentUserDto) {
    const existingProgram = await this.prisma.program.findUnique({
      where: { id },
    });

    if (!existingProgram) {
      throw new NotFoundException('Program not found');
    }

    if(currentUser.role !== UserRole.ADMIN && currentUser.userId !== existingProgram.supervisorId)
    {
      throw new ForbiddenException('You are not authorized to update this Program');
    }

    try {
      await this.prisma.program.delete({
        where: { id },
      });
    } 
    catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete this program because it has related records',
        );
      }

      throw error;
    }

    // Only remove the image after the database deletion succeeds.
    await this.removeImage(existingProgram.imageUrl);
    await this.cache.del(`program:${id}`);
    return {
      message: 'Program deleted successfully',
    };
  }


  private getImageUrl(file?: Express.Multer.File): string | null {
    if (!file) return null;
    return `/uploads/programs/${file.filename}`;
  }

  private async removeImage(imageUrl?: string | null): Promise<void> {
    
    if (!imageUrl?.startsWith('/uploads/programs/')) return;

    const filename = basename(imageUrl);
    if (!filename || filename === '.' || filename === '..') return;

    const imagePath = resolve(
      process.cwd(),
      'uploads',
      'programs',
      filename,
    );

    try {
      await unlink(imagePath);
    } catch (error) {
      // The image may already have been deleted.
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw error;
    }
  }


}
