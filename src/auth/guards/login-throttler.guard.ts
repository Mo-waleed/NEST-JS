import { ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {

    protected getTracker(req: Record<string, any>): Promise<string> {
        const email = req.body.email || 'anonymous';
        return Promise.resolve(`login-${email}`);
    }

    // set the limit to 5 attempts per 5 minutes
    protected getLimit(): Promise<number> {
        return Promise.resolve(5);
    }

    // set the ttl to 5 minutes
    protected getTTL(): Promise<number> {
        return Promise.resolve(5 * 60000);
    }

    // if the limit is reached, return a 429 status code
    protected throwThrottlingException(context: ExecutionContext): Promise<void> {
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
}
