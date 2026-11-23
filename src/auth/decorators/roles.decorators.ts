import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../entities/user.entity.js";

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// this decorator is used to protect a route and check if the user has the required role
// it is used in the @Roles decorator
// it is used in the @UseGuards decorator
// it is used in the @Controller decorator
// it is used in the @Get decorator
// it is used in the @Post decorator
// it is used in the @Put decorator
// it is used in the @Delete decorator