# Blog Posts API

A NestJS API for blog posts and user accounts, stored in PostgreSQL.

Anyone can list and read posts. Creating, updating, or deleting a post requires a Bearer access token. The signed-in user is stored as the author. Only that author, or an account with the `admin` role, can change or remove the post.

Accounts can register, sign in, refresh an access token, and read their profile. An existing admin can create another admin. Request bodies are validated before they are saved. A post id that is not in the database returns `404`. Login attempts are limited per email address.

## Features

- CRUD for posts, with the author taken from the access token
- Public registration and login, with bcrypt password hashes
- Short-lived access tokens and longer-lived refresh tokens
- Role check for admin-only routes
- Author-or-admin check on post updates and deletes
- Login rate limit: 5 attempts per email in a 5-minute window
- Global validation that strips unknown fields and rejects them

## Stack

- [NestJS](https://nestjs.com) 12 on the Express HTTP adapter
- [TypeORM](https://typeorm.io) with the `pg` driver
- `class-validator` and `class-transformer` through a global `ValidationPipe`
- [`@nestjs/config`](https://docs.nestjs.com/techniques/configuration) for environment variables
- [`@nestjs/jwt`](https://docs.nestjs.com/security/authentication) and Passport (`passport-jwt`)
- `bcrypt` for password hashes (10 rounds)
- [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting) for the login limit

The project is ESM. Relative imports end in `.js`.

## Requirements

- Node.js
- [pnpm](https://pnpm.io)
- PostgreSQL, with a database that already exists

`synchronize` creates and updates tables. It does not create the database.

## Configuration

`ConfigModule` loads `.env` and registers `src/config/app.config.ts` (`port`, `nodeEnv`) and `src/config/database.config.ts` (the PostgreSQL connection). JWT signing reads `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`. The process throws at startup if `ACCESS_TOKEN_SECRET` is missing.

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=NestJS

ACCESS_TOKEN_SECRET=replace-with-a-long-random-string
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-string
```

`DATABASE_NAME` must already exist and be reachable with those credentials. Posts are stored in `public.post` and accounts in `public.user`.

`synchronize` is enabled in `TypeOrmModule.forRootAsync`. Keep it on for local development. Turn it off before pointing the app at a shared or production database, and manage schema changes with migrations.

## Setup and run

```bash
pnpm install
```

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production (run pnpm run build first)
pnpm run start:prod
```

The server listens on the `PORT` value from `.env`. The sample configuration uses `3000`. Base URL for the examples below: `http://localhost:3000`.

Other scripts:

```bash
pnpm run build
pnpm run lint
pnpm run format
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```

## Authentication

Protected routes expect the access token as a Bearer token:

```http
Authorization: Bearer <accessToken>
```

`JwtAuthGuard` runs the Passport JWT strategy. The strategy verifies the token with `ACCESS_TOKEN_SECRET`, loads the user by `id`, and attaches that user to the request. `CurrentUser` reads it in the handler. A missing, expired, or invalid access token returns `401`.

`POST /auth/register` creates an account with role `user`. An email that is already stored returns `400`:

```json
{
  "message": "Email already exists",
  "error": "Bad Request",
  "statusCode": 400
}
```

The password is hashed with bcrypt before insert. Responses never include `password`.

`POST /auth/login` loads the user by email, including the password hash, and compares it with bcrypt. A missing user or a wrong password returns `401`:

```json
{
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

A successful login signs two JWTs. Both payloads are `{ id, email, role }`.

| Token | Secret | Lifetime |
| --- | --- | --- |
| `accessToken` | `ACCESS_TOKEN_SECRET` | 1 hour |
| `refreshToken` | `REFRESH_TOKEN_SECRET` | 7 days |

`POST /auth/refresh-token` reads `refreshToken` from the JSON body, verifies it with `REFRESH_TOKEN_SECRET`, and loads the user by the `id` in the payload. Success returns a new access token only. A bad, expired, or unknown token returns `401` with message `Invalid refresh token`.

`GET /auth/profile` requires a valid access token and returns the current user without the password.

`POST /auth/admin` requires a valid access token and the `admin` role. `RolesGuard` reads the roles declared by `@Roles(UserRole.ADMIN)`. A signed-in user who is not an admin receives `403`:

```json
{
  "message": "User does not have the required role",
  "error": "Forbidden",
  "statusCode": 403
}
```

The body uses the same fields as registration. The new account is saved with role `admin`. If that email is already an admin, the response is `400` with `{ "message": "Admin already exists" }`.

Public registration always creates role `user`. The admin route itself requires an admin, so the first admin has to be promoted in the database, for example:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

### Who can change a post

`GET /posts` and `GET /posts/:id` are public.

`POST /posts`, `PATCH /posts/:id`, and `DELETE /posts/:id` require an access token. On update and delete, the service allows the request when the token's user id matches the post author, or when the token's role is `admin`. Anyone else receives `403`:

```json
{
  "message": "You are not the author of this post",
  "error": "Forbidden",
  "statusCode": 403
}
```

## Rate limiting

`ThrottlerModule` is registered in `AppModule`. It is not applied to every route. Only `POST /auth/login` uses `LoginThrottlerGuard`.

The guard counts attempts by the email in the JSON body. The storage key is `login-<email>`. A body with no email shares the key `login-anonymous`. Each email gets its own window.

| Setting | Value |
| --- | --- |
| Limit | 5 attempts |
| Window | 5 minutes |
| Tracker | Email in the login body |

A further attempt inside that window returns `429`:

```json
{
  "statusCode": 429,
  "message": "Too many requests"
}
```

The module's default options (`limit: 10`, `ttl: 60000`) are the throttler defaults. The login guard replaces them with the 5-attempt, 5-minute policy above. Other routes are not rate limited.

## API

| Method | Path | Auth | Success | Behavior |
| --- | --- | --- | --- | --- |
| `GET` | `/` | Public | `200` | Returns the text `Hello World!` |
| `POST` | `/auth/register` | Public | `201` | Creates a user with role `user` and returns the saved user without the password |
| `POST` | `/auth/login` | Public | `201` | Checks email and password and returns the user plus `accessToken` and `refreshToken`. Limited to 5 attempts per email every 5 minutes |
| `POST` | `/auth/refresh-token` | Public | `201` | Verifies the refresh token and returns a new `accessToken` |
| `GET` | `/auth/profile` | Bearer | `200` | Returns the user from the access token, without the password |
| `POST` | `/auth/admin` | Bearer, `admin` | `201` | Creates a user with role `admin` |
| `GET` | `/posts` | Public | `200` | Returns every post, with `authorName` as the author's name |
| `GET` | `/posts/:id` | Public | `200` | Returns one post with the author relation loaded |
| `POST` | `/posts` | Bearer | `201` | Creates a post owned by the current user and returns it with `authorName` as a string |
| `PATCH` | `/posts/:id` | Bearer, author or `admin` | `200` | Updates `title` and `content` when they are sent and returns the saved post |
| `DELETE` | `/posts/:id` | Bearer, author or `admin` | `200` | Deletes the post and returns `{ "message": "Post deleted successfully" }` |

`POST` handlers use Nest's default success status of `201`, except where a handler sets another code. Post create sets `201` explicitly. Login, refresh, register, and admin create also return `201`.

### Request handling

`POST` and `PATCH` bodies pass through the global `ValidationPipe` before the controller method runs. The pipe keeps only fields declared on the DTO, rejects any other property, and transforms the payload onto the DTO class. When `NODE_ENV` is `production`, validation failures omit the per-field messages.

`GET`, `PATCH`, and `DELETE` on `/posts/:id` run the id through `ParseIntPipe`, then `PostExistsPipe`.

- A value that is not an integer returns `400`.
- `PostExistsPipe` loads the post. If that lookup fails, the response is `404`:

```json
{
  "message": "Post not found",
  "error": "Not Found",
  "statusCode": 404
}
```

Create copies `title` and `content` onto a new entity, sets `authorName` to the user from the access token, sets `createdAt`, and saves the row. Update loads the row, copies `title` and `content` when they were sent, and saves it. The author is not changed. TypeORM writes `updatedAt` on that save. Delete loads the row, removes it, and returns a confirmation message.

### Validation

`POST /posts` requires `title` and `content`. Do not send `authorName`; the pipe rejects it because it is not on the create DTO. `PATCH /posts/:id` accepts `title`, `content`, and an optional `authorName` string. The service applies `title` and `content` only. Each field that is sent must pass the same rules. A failed check returns `400`. In development, `message` lists each rule that failed, for example `Title must be at least 3 characters long`.

| Field | Rules |
| --- | --- |
| `title` | String, 3–50 characters. Letters, digits, and spaces only |
| `content` | String, 10–1000 characters. Letters, digits, and spaces only |
| `authorName` | Optional on update only. String, 3–25 characters. Letters, digits, and spaces only. Ignored by the service |

`POST /auth/register` and `POST /auth/admin` require `name`, `email`, and `password`. `POST /auth/login` requires `email` and `password`.

| Field | Rules |
| --- | --- |
| `name` | String, 3–32 characters. Register and admin create |
| `email` | Valid email address |
| `password` | String, at least 6 characters |

## Examples

Register:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Waleed\",\"email\":\"waleed@example.com\",\"password\":\"secret1\"}"
```

```json
{
  "message": "User registered successfully, please login to continue",
  "user": {
    "id": 1,
    "name": "Waleed",
    "email": "waleed@example.com",
    "role": "user",
    "createdAt": "2026-11-23T01:00:00.000Z",
    "updatedAt": "2026-11-23T01:00:00.000Z"
  }
}
```

Log in:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"waleed@example.com\",\"password\":\"secret1\"}"
```

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Waleed",
    "email": "waleed@example.com",
    "role": "user",
    "createdAt": "2026-11-23T01:00:00.000Z",
    "updatedAt": "2026-11-23T01:00:00.000Z"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

After 5 attempts for the same email inside 5 minutes, the next login returns `429` with `{ "statusCode": 429, "message": "Too many requests" }`.

Refresh the access token:

```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"<refresh-jwt>\"}"
```

```json
{
  "accessToken": "<jwt>"
}
```

Read the current profile:

```bash
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <access-jwt>"
```

Create an admin (the caller must already be an admin):

```bash
curl -X POST http://localhost:3000/auth/admin \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin\",\"email\":\"admin@example.com\",\"password\":\"secret1\"}"
```

```json
{
  "message": "Admin created successfully, please login to continue",
  "admin": {
    "id": 2,
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2026-11-23T01:00:00.000Z",
    "updatedAt": "2026-11-23T01:00:00.000Z"
  }
}
```

Create a post. The author comes from the token, not the body:

```bash
curl -X POST http://localhost:3000/posts \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"First Post\",\"content\":\"This is the first post\"}"
```

```json
{
  "id": 1,
  "title": "First Post",
  "content": "This is the first post",
  "authorName": "Waleed",
  "createdAt": "2026-11-22T18:08:49.303Z",
  "updatedAt": "2026-11-22T18:08:49.347Z"
}
```

Update the title (author or admin):

```bash
curl -X PATCH http://localhost:3000/posts/1 \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Updated title\"}"
```

List posts:

```bash
curl http://localhost:3000/posts
```

Read one post:

```bash
curl http://localhost:3000/posts/1
```

Delete a post (author or admin):

```bash
curl -X DELETE http://localhost:3000/posts/1 \
  -H "Authorization: Bearer <access-jwt>"
```

## Data model

TypeORM maps the `Post` and `User` entities to the `post` and `user` tables. On startup, `synchronize` is enabled, so the running schema follows the entities.

A post belongs to one user. `Post.authorName` is a many-to-one relation to `User`, and `User.posts` is the inverse one-to-many. The author's display name is not a separate column on `post`.

### Post

| Column | Database type | Rules |
| --- | --- | --- |
| `id` | integer, primary key | Assigned by the database |
| `title` | `varchar(50)` | Required on create. 3–50 characters |
| `content` | `text` | Required on create. 10–1000 characters |
| `authorName` | foreign key to `user` | Set from the access token on create. Not accepted in the request body |
| `createdAt` | `timestamp` | Set when the row is inserted |
| `updatedAt` | `timestamp` | Set when the row is inserted and refreshed on every save |

List, create, and update responses expose the author's name as a string:

```json
{
  "id": 1,
  "title": "First Post",
  "content": "This is the first post",
  "authorName": "Waleed",
  "createdAt": "2026-11-22T18:08:49.303Z",
  "updatedAt": "2026-11-22T18:08:49.347Z"
}
```

`GET /posts/:id` returns the post with the related user loaded on `authorName` (password omitted):

```json
{
  "id": 1,
  "title": "First Post",
  "content": "This is the first post",
  "authorName": {
    "id": 1,
    "name": "Waleed",
    "email": "waleed@example.com",
    "role": "user",
    "createdAt": "2026-11-23T01:00:00.000Z",
    "updatedAt": "2026-11-23T01:00:00.000Z"
  },
  "createdAt": "2026-11-22T18:08:49.303Z",
  "updatedAt": "2026-11-22T18:08:49.347Z"
}
```

`PostsService` reads and writes through the TypeORM repository for `Post`. Rows remain in PostgreSQL after the process stops.

### User

| Column | Database type | Rules |
| --- | --- | --- |
| `id` | integer, primary key | Assigned by the database |
| `name` | `varchar` | Required on register. 3–32 characters |
| `email` | `varchar`, unique | Required. Must be a valid email |
| `password` | `varchar` | Bcrypt hash. Omitted from queries and from API responses |
| `role` | enum `admin` \| `user` | `user` on public registration. `admin` only through `POST /auth/admin` |
| `createdAt` | `timestamp` | Set when the row is inserted |
| `updatedAt` | `timestamp` | Set when the row is inserted and refreshed on every save |

A user returned by register, login, or `GET /auth/profile` (password is never included):

```json
{
  "id": 1,
  "name": "Waleed",
  "email": "waleed@example.com",
  "role": "user",
  "createdAt": "2026-11-23T01:00:00.000Z",
  "updatedAt": "2026-11-23T01:00:00.000Z"
}
```

## Project layout

| Path | Role |
| --- | --- |
| `src/main.ts` | Creates the app, applies `ValidationPipe`, listens on `PORT` |
| `src/app.module.ts` | Root module. Loads config, TypeORM, posts, auth, and `ThrottlerModule` |
| `src/config/app.config.ts` | Reads `PORT` and `NODE_ENV` |
| `src/config/database.config.ts` | Reads the PostgreSQL connection settings |
| `src/posts/posts.module.ts` | Registers the `Post` repository, controller, and service |
| `src/posts/posts.controller.ts` | HTTP routes for `/posts`. Guards create, update, and delete |
| `src/posts/posts.service.ts` | Create, read, update, and delete. Checks author or admin on writes |
| `src/posts/entities/post.entity.ts` | TypeORM entity, columns, and the author relation |
| `src/posts/dto/create-post.dto.ts` | Rules for `POST /posts` (`title`, `content`) |
| `src/posts/dto/update-post.dto.ts` | Rules for `PATCH /posts/:id` |
| `src/posts/dto/post-response.dto.ts` | Response shape with `authorName` as a string |
| `src/posts/pipe/post-exists.pipe.ts` | Returns `404` when the id is not in the database |
| `src/posts/interfaces/post.interface.ts` | TypeScript shape of a post |
| `src/auth/auth.module.ts` | Registers the `User` repository, JWT module, Passport strategy, and guards |
| `src/auth/auth.controller.ts` | HTTP routes for `/auth`. Applies the login rate limit |
| `src/auth/auth.service.ts` | Register, login, refresh tokens, admin creation, and password hashing |
| `src/auth/entities/user.entity.ts` | TypeORM entity, columns, the `admin` / `user` role, and the posts relation |
| `src/auth/dto/register.dto.ts` | Rules for `POST /auth/register` and `POST /auth/admin` |
| `src/auth/dto/login.dto.ts` | Rules for `POST /auth/login` |
| `src/auth/strategies/jwt.strategy.ts` | Verifies the Bearer access token and loads the current user |
| `src/auth/guards/jwt-auth.guard.ts` | Requires a valid access token |
| `src/auth/guards/roles.guard.ts` | Requires the roles declared with `@Roles()` |
| `src/auth/guards/login-throttler.guard.ts` | Limits `POST /auth/login` to 5 attempts per email every 5 minutes |
| `src/auth/decorators/current-user.decorator.ts` | Reads the user attached by the JWT strategy |
| `src/auth/decorators/roles.decorators.ts` | Declares which roles may call a route |
