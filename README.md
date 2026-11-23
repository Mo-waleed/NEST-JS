# Blog Posts API

A NestJS service that stores blog posts and user accounts in PostgreSQL. It exposes a JSON API to list, read, create, update, and delete posts, and to register, log in, and refresh a JWT. Every write is validated before it is saved. A request for a post id that is not in the database returns `404`.

Post routes do not check the token. Signing in issues an access token and a refresh token; those tokens are not required to call `/posts`.

## Stack

- [NestJS](https://nestjs.com) 12 with the Express HTTP adapter
- [TypeORM](https://typeorm.io) and the `pg` driver
- `class-validator` through a global `ValidationPipe`
- `@nestjs/config` for environment variables
- `@nestjs/jwt` for access and refresh tokens
- `bcrypt` for password hashes

The project is ESM. Relative imports end in `.js`.

## Data model

TypeORM maps the `Post` and `User` entities to the `post` and `user` tables. On startup, `synchronize` is enabled, so the running schema follows the entities. Create the PostgreSQL database yourself before you start the app; synchronize creates and updates tables, and it does not create the database.

### Post

| Column | Database type | Rules |
| --- | --- | --- |
| `id` | integer, primary key | Assigned by the database |
| `title` | `varchar(50)` | Required on create. 3–50 characters |
| `content` | `text` | Required on create. 10–1000 characters |
| `authorName` | `varchar(25)` | Required on create. 3–25 characters |
| `createdAt` | `timestamp` | Set when the row is inserted |
| `updatedAt` | `timestamp` | Set when the row is inserted and refreshed on every save |

`authorName` is stored as text on the post. It is not a foreign key to `user`.

A post returned by the API:

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

`PostsService` reads and writes through the TypeORM repository for `Post`. Rows remain in PostgreSQL after the process stops.

### User

| Column | Database type | Rules |
| --- | --- | --- |
| `id` | integer, primary key | Assigned by the database |
| `name` | `varchar` | Required on register. 3–32 characters |
| `email` | `varchar`, unique | Required. Must be a valid email |
| `password` | `varchar` | Bcrypt hash. Omitted from queries and from API responses |
| `role` | enum `admin` \| `user` | `user` on public registration |
| `createdAt` | `timestamp` | Set when the row is inserted |
| `updatedAt` | `timestamp` | Set when the row is inserted and refreshed on every save |

A user returned by register or login (password is never included):

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

## Request handling

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

Create copies `title`, `content`, and `authorName` onto a new entity, sets `createdAt`, and saves the row. Update loads the row, copies each field that was sent, and saves it. TypeORM writes `updatedAt` on that save. Delete loads the row, removes it, and returns a confirmation message.

### Authentication

`POST /auth/register` rejects an email that is already stored with `400` and `{ "message": "Email already exists" }`. A new account is saved with role `user`. The password is hashed with bcrypt (10 rounds) before insert. The response omits `password`.

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

## Configuration

`ConfigModule` loads `.env` and registers `src/config/app.config.ts` (`port`, `nodeEnv`) and `src/config/database.config.ts` (the PostgreSQL connection). The process reads these values at startup. JWT signing reads `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` from the environment.

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

`DATABASE_NAME` must be a database that already exists and is reachable with those credentials. The example above uses a database named `NestJS`. Posts are stored in `public.post` and accounts in `public.user`.

`synchronize` stays on in `TypeOrmModule.forRootAsync`. Use that for local development. Turn it off before pointing the app at a shared or production database, and manage schema changes with migrations.

## API

Base URL: `http://localhost:3000`

| Method | Path | Success | Behavior |
| --- | --- | --- | --- |
| `GET` | `/` | `200` | Returns the text `Hello World!` |
| `POST` | `/auth/register` | `201` | Creates a user with role `user` and returns the saved user without the password |
| `POST` | `/auth/login` | `201` | Checks email and password and returns the user plus `accessToken` and `refreshToken` |
| `POST` | `/auth/refresh-token` | `201` | Verifies the refresh token and returns a new `accessToken` |
| `GET` | `/posts` | `200` | Returns every post |
| `GET` | `/posts/:id` | `200` | Returns one post |
| `POST` | `/posts` | `201` | Creates a post and returns the saved row |
| `PATCH` | `/posts/:id` | `200` | Updates the fields present in the body and returns the saved row |
| `DELETE` | `/posts/:id` | `200` | Deletes the post and returns `{ "message": "Post deleted successfully" }` |

`POST` handlers use Nest's default success status, which is `201`, except where a handler sets another code. Post create sets `201` explicitly. Login and refresh do not set a status, so they also return `201`.

### Validation

`POST /posts` requires `title`, `content`, and `authorName`. `PATCH /posts/:id` accepts any subset of those fields. Each field that is sent must pass the same rules. A failed check returns `400`. In development, `message` lists each rule that failed, for example `Title must be at least 3 characters long`.

| Field | Rules |
| --- | --- |
| `title` | String, 3–50 characters. Letters, digits, and spaces only |
| `content` | String, 10–1000 characters. Letters, digits, and spaces only |
| `authorName` | String, 3–25 characters. Letters, digits, and spaces only |

`POST /auth/register` requires `name`, `email`, and `password`. `POST /auth/login` requires `email` and `password`.

| Field | Rules |
| --- | --- |
| `name` | String, 3–32 characters. Register only |
| `email` | Valid email address |
| `password` | String, at least 6 characters |

### Examples

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

Create a post:

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"First Post\",\"content\":\"This is the first post\",\"authorName\":\"Waleed\"}"
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

Update the title:

```bash
curl -X PATCH http://localhost:3000/posts/1 \
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

Delete a post:

```bash
curl -X DELETE http://localhost:3000/posts/1
```

## Prerequisites

- Node.js
- [pnpm](https://pnpm.io)
- PostgreSQL, with a database created for this app

## Setup

```bash
pnpm install
```

Copy the configuration block above into `.env` and set the database values and token secrets for your machine.

## Run

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode (requires pnpm run build first)
pnpm run start:prod
```

The server listens on `PORT` (3000 by default).

## Tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# coverage
pnpm run test:cov
```

## Layout

| Path | Role |
| --- | --- |
| `src/main.ts` | Creates the app, applies `ValidationPipe`, listens on `PORT` |
| `src/app.module.ts` | Root module. Loads config, the TypeORM connection, posts, and auth |
| `src/config/app.config.ts` | Reads `PORT` and `NODE_ENV` |
| `src/config/database.config.ts` | Reads the PostgreSQL connection settings |
| `src/posts/posts.module.ts` | Registers the `Post` repository, controller, and service |
| `src/posts/posts.controller.ts` | HTTP routes for `/posts` |
| `src/posts/posts.service.ts` | Create, read, update, and delete through the repository |
| `src/posts/entities/post.entity.ts` | TypeORM entity and column definitions |
| `src/posts/dto/create-post.dto.ts` | Rules for `POST /posts` |
| `src/posts/dto/update-post.dto.ts` | Rules for `PATCH /posts/:id` |
| `src/posts/pipe/post-exists.pipe.ts` | Returns `404` when the id is not in the database |
| `src/posts/interfaces/post.interface.ts` | TypeScript shape of a post |
| `src/auth/auth.module.ts` | Registers the `User` repository, JWT module, controller, and service |
| `src/auth/auth.controller.ts` | HTTP routes for `/auth` |
| `src/auth/auth.service.ts` | Register, login, refresh tokens, and password hashing |
| `src/auth/entities/user.entity.ts` | TypeORM entity, columns, and the `admin` / `user` role |
| `src/auth/dto/register.dto.ts` | Rules for `POST /auth/register` |
| `src/auth/dto/login.dto.ts` | Rules for `POST /auth/login` |
