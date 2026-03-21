import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const prisma = app.get(PrismaService);

  app.setGlobalPrefix('api');
  app.use('/uploads', async (req, res, next) => {
    const objectKey = decodeURIComponent(req.path.replace(/^\/+/, ''));

    if (!objectKey) {
      next();
      return;
    }

    const asset = await prisma.fileAsset.findUnique({
      where: {
        objectKey,
      },
      select: {
        isPrivate: true,
      },
    });

    if (asset?.isPrivate) {
      res.status(404).json({
        message: 'Archivo no disponible.',
      });
      return;
    }

    next();
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'X-Download-Filename'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3001);
}
bootstrap();
