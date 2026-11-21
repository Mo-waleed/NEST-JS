import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import type { Post as PostInterface } from './interfaces/post.interface.js';

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
    findOne(@Param('id', ParseIntPipe) id: number): PostInterface {
        return this.postsService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() post: PostInterface): PostInterface {
        return this.postsService.create(post);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() post: PostInterface): PostInterface {
        return this.postsService.update(id, post);
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number): { message: string } {
        return this.postsService.delete(id);
    }
}
