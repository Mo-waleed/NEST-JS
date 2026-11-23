import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // return the user from the request
});

// this decorator is used to get the current user from the request
// it is used in the @Controller decorator
// it is used in the @Get decorator
// it is used in the @Post decorator
// it is used in the @Put decorator
// it is used in the @Delete decorator