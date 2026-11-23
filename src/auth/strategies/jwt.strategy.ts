import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        const secret = process.env.ACCESS_TOKEN_SECRET;

        if (!secret) {
            throw new Error('ACCESS_TOKEN_SECRET is not defined');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        try {
            const user = await this.authService.findCurrentUserById(payload.id);
            return {
                ...user,
                role: payload.role,
            }
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}

// this strategy is used to validate the JWT token and extract the user data from the token
// it is used in the JwtAuthGuard to validate the token
// it is used in the JwtStrategy to extract the user data from the token
// it is used in the AuthService to find the user by id
// it is used in the AuthController to get the user data
// it is used in the AuthService to find the user by id