import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import appConfig from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe(
    {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: appConfig().nodeEnv === 'production' ? true : false,
    }
  ));


  await app.listen(Number(appConfig().port));
}
await bootstrap();
