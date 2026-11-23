import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { User } from './entities/user.entity.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorators.js';
import { UserRole } from './entities/user.entity.js';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('refresh-token')
    async refreshToken(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }


    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@CurrentUser() user: User) {
        return user;
    }

    // create a admin route
    @Post('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async createAdmin(@Body() registerDto: RegisterDto) {
        return this.authService.createAdmin(registerDto);
    }
}
