import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new
      ValidationPipe(
        {
         transform: true,
         whitelist: true,
         forbidNonWhitelisted: true
         
        }
      )
    );

  await app.listen(3000,()=>{
    console.log("service started on port 3000"); 
  });
}
await bootstrap();
