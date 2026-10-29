import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const programMulterOptions = {
  storage: diskStorage({
    destination: resolve(process.cwd(), 'uploads/programs'),

    filename: (_req, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },

  fileFilter: (
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Only JPEG, PNG and WEBP images are allowed',
      ),
      false,
    );
  }

  callback(null, true);
},
};
