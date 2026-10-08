import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Catch, ExceptionFilter, HttpException, Logger, ValidationPipe, type ArgumentsHost } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { config, validateConfig } from './config.js';
import type { Response } from 'express';
import { validationFailure } from './validation.js';

@Catch()
class ApiErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const body = error.getResponse();
      response.status(error.getStatus()).json(typeof body === 'string' ? { statusCode: error.getStatus(), message: body } : body);
      return;
    }
    // No serializar errores de base de datos: pueden contener datos personales.
    Logger.error('La solicitud no pudo completarse.', 'API');
    response.status(500).json({ statusCode: 500, message: 'No fue posible completar la solicitud.' });
  }
}

async function bootstrap() {
  validateConfig();
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use((_: unknown, res: Response, next: () => void) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    exceptionFactory: validationFailure,
  }));
  app.useGlobalFilters(new ApiErrors());
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
}

bootstrap().catch(() => { Logger.error('No se pudo iniciar la API. Revisa la configuración local.', 'Inicio'); process.exitCode = 1; });
