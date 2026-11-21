# CRUD Posts

A NestJS API for creating, reading, updating, and deleting blog posts. Posts live in memory inside `PostsService`, so the list resets every time the server restarts. Four sample posts are loaded on startup.

## What it does

- List every post, or filter by a search term in the title or content
- Get one post by numeric id
- Create a post (the server assigns `id` and `createdAt`)
- Partially update a post and set `updatedAt`
- Delete a post

Missing posts return `404` with the message `Post not found`.

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

## Endpoints

The server listens on `PORT`, or `3000` when that variable is unset. Routes are under `/posts`. `GET /` still returns `Hello World!`.

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/posts` | Return every post |
| `GET` | `/posts?search=first` | Return posts whose title or content contains the term (case-insensitive) |
| `GET` | `/posts/:id` | Return one post. `:id` must be a number |
| `POST` | `/posts` | Create a post. Responds with `201` and the saved post |
| `PATCH` | `/posts/:id` | Update the fields you send. Responds with the updated post |
| `DELETE` | `/posts/:id` | Delete the post. Responds with `{ "message": "Post deleted successfully" }` |

Create example:

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"New Post\",\"content\":\"Hello\",\"authorName\":\"Ada\"}"
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

- `src/posts/posts.controller.ts` — HTTP routes
- `src/posts/posts.service.ts` — in-memory storage and CRUD
- `src/posts/posts.module.ts` — wires the controller and service
- `src/posts/interfaces/post.interface.ts` — the `Post` shape
