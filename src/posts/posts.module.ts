import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ 
  imports: [TypeOrmModule.forFeature([Post]), AuthModule], // this will make the Post entity available to the PostsService injectable
  controllers: [PostsController],
  providers: [PostsService]
})
export class PostsModule {}
