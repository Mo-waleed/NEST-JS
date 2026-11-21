# Blog Posts API

A NestJS HTTP service for managing blog posts. Clients can list posts, search them, create a post, update part of a post, and delete a post. Every write is checked before it is stored, and a request for an unknown post id returns `404`.

The service is the base for further NestJS work: persistence, request rules, and new features will be added on top of this API. The sections below describe the behavior that is in the code today.

## What it does

`PostsService` keeps posts in memory and loads four sample posts when the process starts. The list is lost when the server stops.

TypeORM connects to PostgreSQL at startup. With `synchronize` enabled, it creates or updates the `post` table from the `Post` entity. The HTTP handlers still read and write the in-memory list. The entity is the schema the service will use when storage moves to the database.

A post from the API looks like this:

```json
{
  "id": 1,
  "title": "First Post",
  "content": "This is the first post",
  "authorName": "John Doe",
  "createdAt": "2026-11-21T16:00:00.000Z",
  "updatedAt": "2026-11-21T16:30:00.000Z"
}
```

`createdAt` is set when the post is created. `updatedAt` is set only after a successful `PATCH`.

The table TypeORM manages matches that shape:

```ts
@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 25 })
  authorName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

`GET`, `PATCH`, and `DELETE` on `/posts/:id` pass the id through `PostExistsPipe` before the handler runs. A missing post returns `404`:

```json
{
  "message": "Post pipe transform not found",
  "error": "Not Found",
  "statusCode": 404
}
```

`PostsService` throws `Post service not found` when it cannot find that id. The pipe catches that error and sends the message above.

## Configuration

`ConfigModule` loads `.env` and registers two config factories. `src/config/app.config.ts` exposes `port` and `nodeEnv`. `src/config/database.config.ts` exposes the PostgreSQL connection. The app listens on `PORT` and opens the database during bootstrap, so these variables have to be set before `start`.

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=posts
```

When `NODE_ENV` is `production`, validation failures do not include the field error messages. `synchronize` is turned on in `TypeOrmModule.forRootAsync`, so the running database schema follows the `Post` entity. Keep that setting for local development.

## Endpoints

Routes for posts are under `/posts`. `GET /` returns `Hello World!`.

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/posts` | Return every post |
| `GET` | `/posts?search=first` | Return posts whose title or content contains the term (case-insensitive) |
| `GET` | `/posts/:id` | Return one post. Unknown ids return `404` |
| `POST` | `/posts` | Create a post. Responds with `201` and the saved post. The server assigns `id` and `createdAt` |
| `PATCH` | `/posts/:id` | Update the fields you send and set `updatedAt`. Responds with the updated post |
| `DELETE` | `/posts/:id` | Delete the post. Responds with `{ "message": "Post deleted successfully" }` |

### Validation

A global `ValidationPipe` allows only fields defined on the DTO, rejects anything else, and transforms the body onto the DTO class.

`POST` and `PATCH` accept `title`, `content`, and `authorName`. Any other property returns `400`. On `POST`, all three fields are required. On `PATCH`, each field is optional, and the fields you send still have to pass the same rules.

| Field | Rules |
| --- | --- |
| `title` | String, 3–50 characters, letters, numbers, and spaces only |
| `content` | String, 10–1000 characters, letters, numbers, and spaces only |
| `authorName` | String, 3–25 characters, letters, numbers, and spaces only |

A failed check returns `400`. In development the `message` array lists each rule that failed, for example `Title must be at least 3 characters long`.

Create example:

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"New Post\",\"content\":\"Hello world\",\"authorName\":\"Ada\"}"
```

Update example:

```bash
curl -X PATCH http://localhost:3000/posts/1 \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Updated title\"}"
```

## Project setup

PostgreSQL has to be running and reachable with the values in `.env`.

```bash
pnpm install
```

## Compile and run

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode
pnpm run start:prod
```

## Tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## Layout

- `src/main.ts` — boots the app, applies `ValidationPipe`, and listens on `PORT`
- `src/app.module.ts` — root module; loads config and the TypeORM connection
- `src/config/app.config.ts` — reads `PORT` and `NODE_ENV`
- `src/config/database.config.ts` — reads the PostgreSQL connection settings
- `src/posts/posts.module.ts` — registers the `Post` entity, controller, and service
- `src/posts/posts.controller.ts` — HTTP routes and search filtering
- `src/posts/posts.service.ts` — in-memory storage and CRUD
- `src/posts/entities/post.entity.ts` — TypeORM `Post` entity and table columns
- `src/posts/dto/create-post.dto.ts` — create-body rules
- `src/posts/dto/update-post.dto.ts` — partial-update rules
- `src/posts/pipe/post-exists.pipe.ts` — rejects unknown post ids with `404`
- `src/posts/interfaces/post.interface.ts` — the `Post` shape returned by the API
