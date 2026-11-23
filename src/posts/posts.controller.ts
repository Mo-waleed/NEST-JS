import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostExistsPipe } from './pipe/post-exists.pipe.js';
import { Post as PostEntity } from './entities/post.entity.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../auth/entities/user.entity.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PostResponseDto } from './dto/post-response.dto.js';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Get()
    async findAll(@Query('search') search?: string): Promise<PostResponseDto[]> {
        return this.postsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe, PostExistsPipe) id: number): Promise<PostEntity> {
        return this.postsService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard)
    async create(@Body() post: CreatePostDto, @CurrentUser() user: User): Promise<PostResponseDto> {
        return this.postsService.create(post, user);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async update(@Param('id', ParseIntPipe, PostExistsPipe) id: number, @Body() post: UpdatePostDto, @CurrentUser() user: User): Promise<PostResponseDto> {
        return this.postsService.update(id, post, user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async delete(@Param('id', ParseIntPipe, PostExistsPipe) id: number, @CurrentUser() user: User): Promise<{ message: string }> {
        return this.postsService.delete(id, user);
    }
}
