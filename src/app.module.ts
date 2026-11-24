import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PostsModule } from './posts/posts.module.js';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config.js';
import { Post } from './posts/entities/post.entity.js';
import { AuthModule } from './auth/auth.module.js';
import { User } from './auth/entities/user.entity.js';
import { ThrottlerModule } from '@nestjs/throttler';
@Module({
  imports:
    [PostsModule, ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
      TypeOrmModule.forRootAsync({
        useFactory: () => ({
          type: 'postgres',
          host: databaseConfig().host,
          port: databaseConfig().port,
          username: databaseConfig().username,
          password: databaseConfig().password,
          database: databaseConfig().name,
          entities: [Post, User], // entities to be used in the application
          synchronize: true, // only use in development
        })
      }),
      AuthModule,
      ThrottlerModule.forRoot([{
        ttl: 60000,
        limit: 10,
      }]),
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
