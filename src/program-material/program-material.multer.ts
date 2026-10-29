
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { diskStorage } from 'multer';

const uploadPath = join(
  process.cwd(),
  'uploads',
  'private',
  'program-materials',
);

mkdirSync(uploadPath, { recursive: true });

export const programMaterialMulterOptions = {
  storage: diskStorage({
    destination: uploadPath,
    filename: (_req, file, callback) => {
      callback(
        null,
        `${randomUUID()}.pdf`,
      );
    },
  }),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: ( _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void) => {
    const isPdf =
      file.mimetype === 'application/pdf' &&
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return callback(
        new BadRequestException('Only PDF files are allowed'),
        false,
      );
    }

    callback(null, true);
  },
};
