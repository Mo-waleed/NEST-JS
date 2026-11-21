import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { PostsService } from '../posts.service.js';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class PostExistsPipe implements PipeTransform {
    constructor(private readonly postsService: PostsService) { }
    transform(value: number, metadata: ArgumentMetadata) {
        try {
            const post = this.postsService.findOne(value);
            if (!post) {
                throw new NotFoundException('Post pipe transform not found');
            }
            return value;
        } catch (error) {
            console.log(error);
            throw new NotFoundException('Post pipe transform not found');
        }
    }
}