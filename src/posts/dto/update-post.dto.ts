import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { IsOptional } from 'class-validator';

export class UpdatePostDto {
    @IsString({ message: 'Title must be a string' })
    @MinLength(3, { message: 'Title must be at least 3 characters long' })
    @MaxLength(50, { message: 'Title must be less than 50 characters long' })
    @Matches(/^[a-zA-Z0-9\s]+$/, { message: 'Title must contain only letters and numbers' })
    @IsOptional()
    title?: string;

    @IsString({ message: 'Content must be a string' })
    @MinLength(10, { message: 'Content must be at least 10 characters long' })
    @MaxLength(1000, { message: 'Content must be less than 1000 characters long' })
    @Matches(/^[a-zA-Z0-9\s]+$/, { message: 'Content must contain only letters and numbers' })
    @IsOptional()
    content?: string;

    @IsString({ message: 'Author must be a string' })
    @MinLength(3, { message: 'Author must be at least 3 characters long' })
    @MaxLength(25, { message: 'Author must be less than 25 characters long' })
    @Matches(/^[a-zA-Z0-9\s]+$/, { message: 'Author must contain only letters and numbers' })
    @IsOptional()
    authorName?: string;
}