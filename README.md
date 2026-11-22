# Blog Posts API

A NestJS service that stores blog posts in PostgreSQL and exposes a JSON API to list, read, create, update, and delete them. Every write is validated before it is saved. A request for an id that is not in the database returns `404`.

## Stack

- [NestJS](https://nestjs.com) 12 with the Express HTTP adapter
- [TypeORM](https://typeorm.io) and the `pg` driver
- `class-validator` through a global `ValidationPipe`
- `@nestjs/config` for environment variables

The project is ESM. Relative imports end in `.js`.

## Data model

TypeORM maps the `Post` entity to the `post` table. On startup, `synchronize` is enabled, so the running schema follows the entity. Create the PostgreSQL database yourself before you start the app; synchronize creates and updates tables, and it does not create the database.

| Column | Database type | Rules |
| --- | --- | --- |
| `id` | integer, primary key | Assigned by the database |
| `title` | `varchar(50)` | Required on create. 3–50 characters |
| `content` | `text` | Required on create. 10–1000 characters |
| `authorName` | `varchar(25)` | Required on create. 3–25 characters |
| `createdAt` | `timestamp` | Set when the row is inserted |
| `updatedAt` | `timestamp` | Set when the row is inserted and refreshed on every save |

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

## Configuration

`ConfigModule` loads `.env` and registers `src/config/app.config.ts` (`port`, `nodeEnv`) and `src/config/database.config.ts` (the PostgreSQL connection). The process reads these values at startup.

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=NestJS
```

`DATABASE_NAME` must be a database that already exists and is reachable with those credentials. The example above uses a database named `NestJS`. Posts are stored in `public.post`.

`synchronize` stays on in `TypeOrmModule.forRootAsync`. Use that for local development. Turn it off before pointing the app at a shared or production database, and manage schema changes with migrations.

## API

Base URL: `http://localhost:3000`

| Method | Path | Success | Behavior |
| --- | --- | --- | --- |
| `GET` | `/` | `200` | Returns the text `Hello World!` |
| `GET` | `/posts` | `200` | Returns every post |
| `GET` | `/posts/:id` | `200` | Returns one post |
| `POST` | `/posts` | `201` | Creates a post and returns the saved row |
| `PATCH` | `/posts/:id` | `200` | Updates the fields present in the body and returns the saved row |
| `DELETE` | `/posts/:id` | `200` | Deletes the post and returns `{ "message": "Post deleted successfully" }` |

### Validation

`POST` requires `title`, `content`, and `authorName`. `PATCH` accepts any subset of those fields. Each field that is sent must pass the same rules. A failed check returns `400`. In development, `message` lists each rule that failed, for example `Title must be at least 3 characters long`.

| Field | Rules |
| --- | --- |
| `title` | String, 3–50 characters. Letters, digits, and spaces only |
| `content` | String, 10–1000 characters. Letters, digits, and spaces only |
| `authorName` | String, 3–25 characters. Letters, digits, and spaces only |

### Examples

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

Copy the configuration block above into `.env` and set the database values for your machine.

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
| `src/app.module.ts` | Root module. Loads config and the TypeORM connection |
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
