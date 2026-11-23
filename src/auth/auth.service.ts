import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { UserRole } from './entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto) {

        const existingUser = await this.userRepository.findOne({ where: { email: registerDto.email } });
        if (existingUser) {
            throw new BadRequestException('Email already exists');
        }

        const hashedPassword = await this.hashPassword(registerDto.password);

        const newUser = this.userRepository.create({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            role: UserRole.USER,
        });
        const savedUser = await this.userRepository.save(newUser);

        const { password, ...user } = savedUser;
        return {
            message: 'User registered successfully, please login to continue',
            user,
        };
    }

    async createAdmin(registerDto: RegisterDto) {

        const existingAdmin = await this.userRepository.findOne({ where: { email: registerDto.email, role: UserRole.ADMIN } });
        if (existingAdmin) {
            throw new BadRequestException('Admin already exists');
        }

        const hashedPassword = await this.hashPassword(registerDto.password);

        const newAdmin = this.userRepository.create({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            role: UserRole.ADMIN,
        });
        const savedAdmin = await this.userRepository.save(newAdmin);

        const { password, ...admin } = savedAdmin;
        return {
            message: 'Admin created successfully, please login to continue',
            admin,
        };
    }

    async login(loginDto: LoginDto) {
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email: loginDto.email })
            .getOne();

        if (!user || ! await this.comparePassword(loginDto.password, user.password)) {
            throw new UnauthorizedException('Invalid email or password');
        }
        // generate token
        const tokens = this.generateTokens(user);
        const { password, ...userData } = user;
        return {
            message: 'Login successful',
            user: userData,
            ...tokens,
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const decoded = this.jwtService.verify(refreshToken, { secret: process.env.REFRESH_TOKEN_SECRET });
            const user = await this.userRepository.createQueryBuilder('user').addSelect('user.password').where('user.id = :id', { id: decoded.id }).getOne();
            if (!user) {
                throw new UnauthorizedException('Invalid refresh token');
            }
            const accessToken = this.generateAccessToken(user);
            return { accessToken };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // find the current user by id

    async findCurrentUserById(id: string) {
        const user = await this.userRepository.findOne({ where: { id: Number(id) } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        const { password, ...userData } = user;
        return userData;
    }

    private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }

    private async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, 10);
    }

    private generateTokens(user: User) {
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);
        return { accessToken, refreshToken };
    }

    private generateAccessToken(user: User) {
        const payload = { id: user.id, email: user.email, role: user.role };
        return this.jwtService.sign(payload, { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1h' });
    }

    private generateRefreshToken(user: User) {
        const payload = { id: user.id, email: user.email, role: user.role };
        return this.jwtService.sign(payload, { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' });
    }
}
