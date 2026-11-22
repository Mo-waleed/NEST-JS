import {
    ArgumentMetadata,
    Injectable,
    PipeTransform,
    NotFoundException,
} from '@nestjs/common';

import { PostsService } from '../posts.service.js';

@Injectable()
export class PostExistsPipe implements PipeTransform {

    constructor(private readonly postsService: PostsService) {}

    async transform(value: number, metadata: ArgumentMetadata) {

        try {
            await this.postsService.findOne(value);

            return value;

        } catch (error) {
            throw new NotFoundException('Post not found');
        }
    }
}