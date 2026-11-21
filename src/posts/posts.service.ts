import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from './interfaces/post.interface.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Injectable()
export class PostsService {
    private posts: Post[] = [
        {
            id: 1,
            title: 'First Post',
            content: 'This is the first post',
            authorName: 'John Doe',
            createdAt: new Date(),
        },
        {
            id: 2,
            title: 'Second Post',
            content: 'This is the second post',
            authorName: 'Jane Doe',
            createdAt: new Date(),
        },
        {
            id: 3,
            title: 'Third Post',
            content: 'This is the third post',
            authorName: 'John Doe',
            createdAt: new Date(),
        },
        {
            id: 4,
            title: 'Fourth Post',
            content: 'This is the fourth post',
            authorName: 'Jane Doe',
            createdAt: new Date(),
        },
    ];
    findAll(): Post[] {
        return this.posts;
    }
    findOne(id: number): Post {
        const singlePost = this.posts.find(post => post.id === id);
        if (!singlePost) {
            throw new NotFoundException('Post service not found');
        }
        return singlePost;
    }
    create(post: CreatePostDto): Post {  
        const newPost = { ...post, id: this.getNextId(), createdAt: new Date() };
        this.posts.push(newPost);
        return newPost;
    }

    update(id: number, post: UpdatePostDto): Post {
        const index = this.posts.findIndex(post => post.id === id);
        if (index === -1) {
            throw new NotFoundException('Post service not found');
        }
        this.posts[index] = { ...this.posts[index], ...post, updatedAt: new Date() };
        return this.posts[index];
    }

    delete(id: number): { message: string } {
        const index = this.posts.findIndex(post => post.id === id);
        if (index === -1) {
            throw new NotFoundException('Post service not found');
        }
        this.posts.splice(index, 1);
        return { message: 'Post deleted successfully' };
    }

    private getNextId(): number {
        return this.posts.length > 0 ? Math.max(...this.posts.map(post => post.id)) + 1 : 1;
    }
}
