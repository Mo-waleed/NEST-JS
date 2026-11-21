import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import appConfig from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe(
    {
      whitelist: true, // allow only the fields that are defined in the DTO
      forbidNonWhitelisted: true, // throw an error if a non-whitelisted field is sent
      transform: true, // transform the payload to the DTO type
      disableErrorMessages: appConfig().nodeEnv === 'production' ? true : false, // disable error messages in production
    }
  ));


  await app.listen(Number(appConfig().port));
}
await bootstrap();
