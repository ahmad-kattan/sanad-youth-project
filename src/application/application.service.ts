import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { currentUserDto } from '../user/dto/currentUserDto.js';
import { UserRole } from '../common/Enums/index.js';
import { ApplicationQueryDto } from './dto/application-query.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { ApplicationStatusdto } from './dto/application-status-dto.js';
import { unlink } from 'fs/promises';
import { basename, resolve } from 'path';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma:PrismaService){}

 

  async create(dto: CreateApplicationDto,currentUser: currentUserDto,file?: Express.Multer.File) {

    try {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Only students can submit applications',
      );
    }

    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
      select: {
        id: true,
        availableSeats: true,
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (program.availableSeats <= 0) {
      throw new ConflictException(
        'No available seats in this program',
      );
    }

    return await this.prisma.application.create({
      data: {
        studentId: currentUser.userId,
        programId: dto.programId,
        ...(file && {cvUrl: `/uploads/applications/${file.filename}`}),
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  } catch (error) {

    await this.removeUploadedFile(file);

    if (this.isPrismaError(error, 'P2002')) {
      throw new ConflictException(
        'You have already applied to this program',
      );
    }

    if (this.isPrismaError(error, 'P2003')) {
      throw new BadRequestException(
        'Invalid student or program reference',
      );
    }

    throw error;
  }
}

  async findAll(query:ApplicationQueryDto,currentUser:currentUserDto) {
     const {page=1,limit=10,search,sortBy='createdAt',sortOrder='desc'} = query;
     if (currentUser.role!==UserRole.ADMIN)
     {
      throw new ForbiddenException('You cannot view applications');
     }
     const skip = (page - 1) * limit;
     const where = search? {
                OR: [
                  {
                    student: {
                      firstName: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    student: {
                      lastName: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    student: {
                      email: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                  {
                    program: {
                      title: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                ],
              }: {};
          const [data, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
      }),
      this.prisma.application.count({ where }),
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


  async findOne(id: number , currentUser:currentUserDto) {
    const application =await this.getApplication(id);
    if (currentUser.role === UserRole.STUDENT && 
      application.studentId !==currentUser.userId)
      {
         throw new ForbiddenException('You can only view your own applications');
      }

       if (currentUser.role === UserRole.SUPERVISOR &&
      application.program.supervisorId !== currentUser.userId) {
      throw new ForbiddenException(
        'You can only view applications for your programs',
      );}

      return application;

  }

  async findAllMyApplications(currentUser:currentUserDto)
  {
     if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Only students can view their enrollments',
      );
    }

    return this.prisma.application.findMany({
      where:{studentId:currentUser.userId},
      orderBy: {createdAt: 'desc'},
      include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
    })

  } 

  async findStudentsByProgram(programId: number,currentUser: currentUserDto)
   {
  if (currentUser.role !== UserRole.ADMIN &&currentUser.role !== UserRole.SUPERVISOR)
     {
      throw new ForbiddenException('Only admin and supervisors can view program students');
     }

  const program = await this.prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      title: true,
      supervisorId: true,
    },
  });

  if (!program) {
    throw new NotFoundException('Program not found');
  }

  if (currentUser.role === UserRole.SUPERVISOR && program.supervisorId !== currentUser.userId) 
    {
      throw new ForbiddenException('You cannot view students of this program');
    }

  const students = await this.prisma.user.findMany({
    where: {
      role: UserRole.STUDENT,
      applications: {
        some: {
          programId,
          status: ApplicationStatusdto.ACCEPTED,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  return {
    program: {id: program.id,title: program.title},
    totalStudents: students.length,
    students,
  };
}

  async updateStatus(id: number,dto: UpdateApplicationStatusDto,currentUser: currentUserDto) {
    const application = await this.getApplication(id);

     if (currentUser.role !== UserRole.ADMIN) {
    throw new ForbiddenException(
      'Only admins can accept or reject applications',
    );
  }

  if (application.status !== ApplicationStatusdto.PENDING) {
    throw new ConflictException(
      'Only pending applications can be accepted or rejected',
    );
  }

    return this.prisma.$transaction(async (tx) => {

      if (dto.status === ApplicationStatusdto.ACCEPTED) {
        const seatUpdate = await tx.program.updateMany({
          where: {
            id: application.programId,
            availableSeats: { gt: 0 },
          },
          data: {
            availableSeats: { decrement: 1 },
          },
        });

        if (seatUpdate.count === 0) {
          throw new ConflictException(
            'No available seats in this program',
          );
        }
      }

      const updated = await tx.application.updateMany({
        where: {
          id,
          status: ApplicationStatusdto.PENDING,
        },
        data: {
          status: dto.status,
        },
      });

      if (updated.count === 0) {
        throw new ConflictException(
          'Application status changed. Please try again',
        );
      }

      return tx.application.findUnique({
        where: { id },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          program: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    });
  }

    async remove(id: number, currentUser: currentUserDto) {
    const application = await this.getApplication(id);

    const isAdmin = currentUser.role === UserRole.ADMIN;

    const isSupervisorOwner =
      currentUser.role === UserRole.SUPERVISOR &&
      application.program.supervisorId === currentUser.userId;

    const isStudentOwner =
      currentUser.role === UserRole.STUDENT &&
      application.studentId === currentUser.userId;

    if (!isAdmin && !isSupervisorOwner && !isStudentOwner) {
      throw new ForbiddenException(
        'You cannot delete this application',
      );
    }

    if (!isAdmin && application.status === ApplicationStatusdto.ACCEPTED ) {
      throw new ConflictException(
        'Only an admin can delete an accepted application',
      );
    }

    if (
      isStudentOwner &&
      application.status !== ApplicationStatusdto.PENDING
    ) {
      throw new ConflictException(
        'You can only delete pending applications',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.application.delete({
        where: { id },
      });

      if (application.status === ApplicationStatusdto.ACCEPTED) {
        await tx.program.update({
          where: { id: application.programId },
          data: {
            availableSeats: { increment: 1 },
          },
        });
      }
      
      await this.removeCvFile(application.cvUrl);
      return {
        message: 'Application deleted successfully',
      };
    });
  }
  
  async updateCv(id: number,file: Express.Multer.File,currentUser: currentUserDto) {
  try {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (
      currentUser.role !== UserRole.STUDENT ||
      application.studentId !== currentUser.userId
    ) {
      throw new ForbiddenException(
        'You can only update your own CV',
      );
    }

    if (application.status !== ApplicationStatusdto.PENDING) {
      throw new ConflictException(
        'You can only update the CV of a pending application',
      );
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        cvUrl: `/uploads/applications/${file.filename}`,
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Delete the previous file only after the database update succeeds.
    await this.removeCvFile(application.cvUrl);

    return updated;

  } catch (error) {
    await this.removeUploadedFile(file);
    throw error;
  }
}

async trackApplicationStatus(id: number,currentUser: currentUserDto) {
  const application = await this.prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      status: true,
      program: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  if (
    currentUser.role !== UserRole.ADMIN &&
    application.studentId !== currentUser.userId
  ) {
    throw new ForbiddenException(
      'You are not allowed to track this application',
    );
  }

  return {
    applicationId: application.id,
    program: application.program,
    status: application.status,
  };
}



 private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

   private async getApplication(id: number) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          include: {
            supervisor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }
  
  private async removeUploadedFile(file?: Express.Multer.File): Promise<void> {
  if (!file?.path) return;
  try {
    await unlink(file.path);
  } catch {
  }}

  private async removeCvFile(cvUrl?: string | null): Promise<void> {
  if (!cvUrl?.startsWith('/uploads/applications/')) return;

  const filename = basename(cvUrl);

  if (!filename || filename === '.' || filename === '..') return;

  const filePath = resolve(
    process.cwd(),
    'uploads',
    'applications',
    filename,
  );

  try {
    await unlink(filePath);
  } catch {
  }}

}

