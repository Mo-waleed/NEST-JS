import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../entities/user.entity.js";
import { ROLES_KEY } from "../decorators/roles.decorators.js";


@Injectable()

export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(), // get the handler of the current request
            context.getClass(), // get the class of the current request
        ]);

        if (!requiredRoles) {
            return true; // if no roles are required, the request is allowed
        }

        const { user } = context.switchToHttp().getRequest(); // get the user from the request
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        const hasRole = requiredRoles.some((role) => user.role === role); // check if the user has the required role
        if (!hasRole) {
            throw new ForbiddenException('User does not have the required role');
        }
        return true;
    }
}

// this guard is used to protect a route and check if the user has the required role
// it is used in the @Roles decorator
// it is used in the @UseGuards decorator
// it is used in the @Controller decorator
// it is used in the @Get decorator
// it is used in the @Post decorator
// it is used in the @Put decorator
// it is used in the @Delete decorator