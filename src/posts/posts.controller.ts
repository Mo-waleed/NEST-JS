import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import type { Post as PostInterface } from './interfaces/post.interface.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostExistsPipe } from './pipe/post-exists.pipe.js';

@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Get()
    findAll(@Query('search') search?: string): PostInterface[] {
        const extractPosts = this.postsService.findAll();
        if (search) {
            return extractPosts.filter(post => post.title.toLowerCase().includes(search.toLowerCase()) || post.content.toLowerCase().includes(search.toLowerCase()));
        }
        return extractPosts;
    }

    @Get(':id')
    findOne(@Param('id', PostExistsPipe) id: number): PostInterface {
        return this.postsService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() post: CreatePostDto): PostInterface {
        return this.postsService.create(post);
    }

    @Patch(':id')
    update(@Param('id', PostExistsPipe) id: number, @Body() post: UpdatePostDto): PostInterface {
        return this.postsService.update(id, post);
    }

    @Delete(':id')
    delete(@Param('id', PostExistsPipe) id: number): { message: string } {
        return this.postsService.delete(id);
    }
}
