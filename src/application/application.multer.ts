import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const uploadDir = resolve(process.cwd(), 'uploads', 'applications');

mkdirSync(uploadDir, { recursive: true });

export const applicationMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),

  fileFilter: (_req, file, callback) => {
    const isPdf =
      file.mimetype === 'application/pdf' &&
      extname(file.originalname).toLowerCase() === '.pdf';

    if (!isPdf) {
      return callback(
        new BadRequestException('Only PDF files are allowed'),
        false,
      );
    }

    callback(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
};