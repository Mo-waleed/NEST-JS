import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post as PostEntity } from './entities/post.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { UserRole } from '../auth/entities/user.entity.js';
import { PostResponseDto } from './dto/post-response.dto.js';

@Injectable()
export class PostsService {

    constructor(@InjectRepository(PostEntity) private postRepository: Repository<PostEntity>) {

    }

    async findAll(): Promise<PostResponseDto[]> {
        const allPosts = await this.postRepository.find({ relations: { authorName: true } });
        return allPosts.map(post => ({
            ...post,
            authorName: post.authorName?.name ?? 'Unknown',
        }));
    }
    async findOne(id: number): Promise<PostEntity> {
        const singlePost = await this.postRepository.findOne({ where: { id }, relations: { authorName: true } });
        if (!singlePost) {
            throw new NotFoundException('Post service not found');
        }
        return singlePost;
    }
    async create(post: CreatePostDto, authorName: User): Promise<PostResponseDto> {
        const newPost = this.postRepository.create({
            title: post.title,
            content: post.content,
            authorName: authorName,
            createdAt: new Date(),
        });
        const savedPost = await this.postRepository.save(newPost);
        return {
            id: savedPost.id,
            title: savedPost.title,
            content: savedPost.content,
            authorName: savedPost.authorName.name,
            createdAt: savedPost.createdAt,
            updatedAt: savedPost.updatedAt,
        };
    }

    async update(id: number, updatedPost: UpdatePostDto, authorName: User): Promise<PostResponseDto> {

        const findPostToUpdate = await this.findOne(id);
        if (!findPostToUpdate) {
            throw new NotFoundException('Post service not found');
        }

        if (findPostToUpdate.authorName.id !== authorName.id && authorName.role !== UserRole.ADMIN) {
            throw new ForbiddenException('You are not the author of this post');
        }

        if (updatedPost.title) {
            findPostToUpdate.title = updatedPost.title;
        }
        if (updatedPost.content) {
            findPostToUpdate.content = updatedPost.content;
        }

        const savedPost = await this.postRepository.save(findPostToUpdate);
        return {
            ...savedPost,
            authorName: savedPost.authorName.name,
        };
    }

    async delete(id: number, authorName: User): Promise<{ message: string }> {

        const findPostToDelete = await this.findOne(id);
        if (!findPostToDelete) {
            throw new NotFoundException('Post service not found');
        }

        if (
            authorName.role !== UserRole.ADMIN &&
            (!findPostToDelete.authorName ||
                findPostToDelete.authorName.id !== authorName.id)
        ) {
            throw new ForbiddenException(
                'You are not the author of this post',
            );
        }

        await this.postRepository.remove(findPostToDelete as PostEntity);
        return { message: 'Post deleted successfully' };
    }

}
