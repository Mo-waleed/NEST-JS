import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { JwtModule } from '@nestjs/jwt';    
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
    imports: [TypeOrmModule.forFeature([User]),
    JwtModule.register({
        secret: process.env.ACCESS_TOKEN_SECRET,
        signOptions: { expiresIn: '1h' },
    })],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, RolesGuard], // JwtStrategy is used to validate the JWT token and extract the user data from the token, RolesGuard is used to protect a route and check if the user has the required role
    exports: [AuthService,RolesGuard],
})
export class AuthModule { }
