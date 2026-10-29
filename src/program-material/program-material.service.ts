import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProgramMaterialDto } from './dto/create-program-material.dto.js';
import { UpdateProgramMaterialDto } from './dto/update-program-material.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { currentUserDto } from '../user/dto/currentUserDto.js';
import { UserRole } from '../common/Enums/index.js';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class ProgramMaterialService {
  
  constructor(private readonly prisma:PrismaService) {}

   async create(dto: CreateProgramMaterialDto,user: currentUserDto,file?: Express.Multer.File) 
  {
    if (!file) {
      throw new BadRequestException('A PDF file is required');
    }

    try {
      await this.checkProgramAccess(dto.programId, user);

      if (user.role === UserRole.STUDENT) {
        throw new ForbiddenException(
          'Students cannot upload program materials',
        );
      }

      const material = await this.prisma.programMaterial.create({
        data: {
          programId: dto.programId,
          title: dto.title,
          description: dto.description?dto.description:null,
          fileUrl: path.join(
            'uploads',
            'private',
            'program-materials',
            file.filename,
          ),
        },
        include: {
          program: {
            select: { id: true, title: true },
          },
        },
      });

      return material;

    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }
  }

  async findAll(programId: number | undefined,user: currentUserDto)
  {
  let where: any = {};

  if (programId !== undefined) {
    where.programId = programId;
  }

  if (user.role === UserRole.SUPERVISOR) {
    where.program = {
      supervisorId: user.userId,
    };
  } else if (user.role === UserRole.STUDENT) {
    where.program = {
      applications: {
        some: {
          studentId: user.userId,
          status: 'ACCEPTED',
        },
      },
    };
  } else if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException(
      'You cannot access program materials',
    );
  }

  return this.prisma.programMaterial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      programId: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      program: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })}

   async findOne(id: number, user: currentUserDto) {
    const material = await this.getMaterialOrFail(id);

    await this.checkProgramAccess(material.programId, user);

    const { fileUrl, ...safeMaterial } = material;

    return safeMaterial;
  }

  async getFile(id: number, user: currentUserDto) 
  {
    const material = await this.getMaterialOrFail(id);

    await this.checkProgramAccess(material.programId, user);

    const fullPath = path.resolve(process.cwd(), material.fileUrl);

    if (
      !fullPath.startsWith(this.uploadDirectory + '\\') &&
      !fullPath.startsWith(this.uploadDirectory + '/')
    ) {
      throw new ForbiddenException('Invalid file path');
    }

    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException('Material file not found');
    }

    return {
      fullPath,
      filename: `${material.title}.pdf`,
    };
  }

   async update(id: number,dto: UpdateProgramMaterialDto,user: currentUserDto,file?: Express.Multer.File)
    {

    try {
      const material = await this.getMaterialOrFail(id);

      await this.checkProgramAccess(material.programId, user);

      if (user.role === UserRole.STUDENT) {
        throw new ForbiddenException(
          'Students cannot update program materials',
        );
      }
      const updated = await this.prisma.programMaterial.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(file && {
            fileUrl: path.join(
              'uploads',
              'private',
              'program-materials',
              file.filename,
            ),
          }),
        },
        include: {
          program: {
            select: { id: true, title: true },
          },
        },
      });

      if (file && material.fileUrl !== updated.fileUrl) {
        await this.deleteFile(material.fileUrl);
      }

      const { fileUrl, ...safeMaterial } = updated;
      return safeMaterial;
    } catch (error) {
      await this.removeUploadedFile(file);
      throw error;
    }
  }

  async remove(id: number, user: currentUserDto) {
    const material = await this.getMaterialOrFail(id);

    await this.checkProgramAccess(material.programId, user);

    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException(
        'Students cannot delete program materials',
      );
    }

    await this.prisma.programMaterial.delete({
      where: { id },
    });

    await this.deleteFile(material.fileUrl);

    return { message: 'Program material deleted successfully' };
  }




  private readonly uploadDirectory = path.resolve(
    process.cwd(),
    'uploads',
    'private',
    'program-materials',
  );
  
   private isAdmin(user: currentUserDto): boolean {
    return user.role === UserRole.ADMIN;
  }

   private async deleteFile(fileUrl?: string | null): Promise<void> {
  if (!fileUrl) return;

  const fullPath = path.resolve(process.cwd(), fileUrl);

  const relativePath = path.relative(
    this.uploadDirectory,
    fullPath,
  );

  // نتأكد أن الملف ضمن مجلد المواد، وليس خارجه.
  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath)
  ) {
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== 'ENOENT') {
      throw error;
    }
  }
}

  private async removeUploadedFile(file?: Express.Multer.File): Promise<void> {
  if (!file) return;

  try {
    await fs.unlink(file.path);
  } catch {
  }
}

  private async getMaterialOrFail(id: number) {
    const material = await this.prisma.programMaterial.findUnique({
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

    if (!material) {
      throw new NotFoundException('Program material not found');
    }

    return material;
  }

  private async checkProgramAccess(programId: number,user: currentUserDto):
  Promise<void> {
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
      select: { id: true, supervisorId: true },
    });

    if (this.isAdmin(user)) return;

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (user.role === UserRole.SUPERVISOR) {
      if (program.supervisorId !== user.userId) {
        throw new ForbiddenException(
          'You can access materials only for your own programs',
        );
      }

      return;
    }

    if (user.role === UserRole.STUDENT) {
      const application = await this.prisma.application.findFirst({
        where: {
          programId,
          studentId: user.userId,
          status: 'ACCEPTED',
        },
        select: { id: true },
      });

      if (!application) {
        throw new ForbiddenException(
          'Only students accepted into this program can access its materials',
        );
      }

      return;
    }

    throw new ForbiddenException('You cannot access program materials');
  }




  
}
