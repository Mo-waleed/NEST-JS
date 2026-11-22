import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post as PostEntity } from './entities/post.entity.js';

@Injectable()
export class PostsService {

    constructor(@InjectRepository(PostEntity) private postRepository: Repository<PostEntity>) {

    }

    async findAll(): Promise<PostEntity[]> {
        return await this.postRepository.find();
    }
    async findOne(id: number): Promise<PostEntity> {
        const singlePost = await this.postRepository.findOne({ where: { id } });
        if (!singlePost) {
            throw new NotFoundException('Post service not found');
        }
        return singlePost;
    }
    async create(post: CreatePostDto): Promise<PostEntity> {
        const newPost = this.postRepository.create({
            title: post.title,
            content: post.content,
            authorName: post.authorName,
            createdAt: new Date(),
        });
        return await this.postRepository.save(newPost);
    }

    async update(id: number, updatedPost: UpdatePostDto): Promise<PostEntity> {

        const findPostToUpdate = await this.findOne(id);
        if (!findPostToUpdate) {
            throw new NotFoundException('Post service not found');
        }

        if (updatedPost.title) {
            findPostToUpdate.title = updatedPost.title;
        }
        if (updatedPost.content) {
            findPostToUpdate.content = updatedPost.content;
        }
        if (updatedPost.authorName) {
            findPostToUpdate.authorName = updatedPost.authorName;
        }

        return await this.postRepository.save(findPostToUpdate);
    }

    async delete(id: number): Promise<{ message: string }> {

        const findPostToDelete = await this.findOne(id);
        if (!findPostToDelete) {
            throw new NotFoundException('Post service not found');
        }

        await this.postRepository.remove(findPostToDelete as PostEntity);
        return { message: 'Post deleted successfully' };
    }

}
