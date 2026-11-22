import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostExistsPipe } from './pipe/post-exists.pipe.js';
import { Post as PostEntity } from './entities/post.entity.js';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Get()
    async findAll(@Query('search') search?: string): Promise<PostEntity[]> {
        return this.postsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id',ParseIntPipe, PostExistsPipe) id: number): Promise<PostEntity> {
        return this.postsService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() post: CreatePostDto): Promise<PostEntity> {
        return this.postsService.create(post);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe, PostExistsPipe) id: number, @Body() post: UpdatePostDto): Promise<PostEntity> {
        return this.postsService.update(id, post);
    }

    @Delete(':id')
    async delete(@Param('id', ParseIntPipe, PostExistsPipe) id: number): Promise<{ message: string }> {
        return this.postsService.delete(id);    
    }
}
