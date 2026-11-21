# CRUD Posts

A NestJS API for creating, reading, updating, and deleting blog posts. Posts live in memory inside `PostsService`, so the list resets every time the server restarts. Four sample posts are loaded on startup.

Request bodies are checked with `class-validator` DTOs. A global `ValidationPipe` strips unknown fields and rejects them. `GET`, `PATCH`, and `DELETE` on `/posts/:id` run the id through `PostExistsPipe` before the handler runs.

## What it does

- List every post, or filter by a search term in the title or content
- Get one post by id
- Create a post (the server assigns `id` and `createdAt`)
- Partially update a post and set `updatedAt`
- Delete a post

A missing post returns `404`:

```json
{
  "message": "Post pipe transform not found",
  "error": "Not Found",
  "statusCode": 404
}
```

`PostsService` throws `Post service not found` when it cannot find that id. The pipe catches that error and sends the message above.

A post looks like this:

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

`updatedAt` is only present after a post has been patched.

## Configuration

`ConfigModule` loads `.env` and `src/config/app.config.ts` exposes `port` and `nodeEnv`. The app listens on `PORT`.

```env
NODE_ENV=development
PORT=3000
```

When `NODE_ENV` is `production`, validation failures do not include the field error messages.

## Endpoints

Routes are under `/posts`. `GET /` still returns `Hello World!`.

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/posts` | Return every post |
| `GET` | `/posts?search=first` | Return posts whose title or content contains the term (case-insensitive) |
| `GET` | `/posts/:id` | Return one post. Unknown ids return `404` |
| `POST` | `/posts` | Create a post. Responds with `201` and the saved post |
| `PATCH` | `/posts/:id` | Update the fields you send. Responds with the updated post |
| `DELETE` | `/posts/:id` | Delete the post. Responds with `{ "message": "Post deleted successfully" }` |

### Validation

`POST` and `PATCH` only accept `title`, `content`, and `authorName`. Any other property returns `400`. On `POST`, all three fields are required. On `PATCH`, each field is optional, and the fields you send still have to pass the same rules.

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
- `src/config/app.config.ts` — reads `PORT` and `NODE_ENV`
- `src/posts/posts.controller.ts` — HTTP routes
- `src/posts/posts.service.ts` — in-memory storage and CRUD
- `src/posts/posts.module.ts` — wires the controller and service
- `src/posts/dto/create-post.dto.ts` — create-body rules
- `src/posts/dto/update-post.dto.ts` — partial-update rules
- `src/posts/pipe/post-exists.pipe.ts` — rejects unknown post ids with `404`
- `src/posts/interfaces/post.interface.ts` — the `Post` shape
