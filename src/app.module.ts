import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PostsModule } from './posts/posts.module.js';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config.js';
@Module({
  imports: [PostsModule, ConfigModule.forRoot({
    isGlobal: true,
    load: [appConfig],
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
