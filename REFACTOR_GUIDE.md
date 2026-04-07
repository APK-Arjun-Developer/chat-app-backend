# WebSocket Backend Refactor Plan (Clean/Modular Architecture)

## 1) Folder structure

```text
src/
  config/                 # env + logger
  domain/                 # entities and business types
  infrastructure/
    db/                   # DB adapter and migrations
  modules/
    auth/
      auth.repository.ts
      auth.service.ts
      auth.socket-handler.ts
    group/
      group.repository.ts
      group.service.ts
      group.socket-handler.ts
    chat/
      chat.repository.ts
      chat.service.ts
      chat.socket-handler.ts
  shared/
    errors/
    validation/
  socket/
    register-handlers.ts
    socket-context.ts
    socket-error-wrapper.ts
    types.ts
  main.ts
```

## 2) Layer responsibilities

- **Socket handlers/controllers**: Transport-only; parse payload and delegate to services.
- **Services**: Business rules (auth, authorization, group join flow, chat flow).
- **Repositories**: Isolated SQL queries and persistence details.
- **Infrastructure**: database and framework wiring.
- **Shared**: cross-cutting concerns (errors, validation schemas).

## 3) Socket event architecture

- `connection` lifecycle in `socket/register-handlers.ts`
- Event handlers live by module (`auth`, `group`, `chat`)
- Emitters are invoked in handlers after service execution
- Socket session state is centralized in `socket/socket-context.ts`
- Common validation/error middleware via `withSocketErrorHandling`

## 4) Before vs after (sample)

### Before (single-file anti-pattern)
- `server.ts` mixed SQL + event listeners + validation + auth logic in one place.

### After (modular)
- `auth.socket-handler.ts` only maps event to service.
- `auth.service.ts` owns register/login rules.
- `auth.repository.ts` owns user queries.

## 5) Example flow implemented

- **Event**: `message(groupId, text)` in `chat.socket-handler.ts`
- **Service**: `ChatService.sendMessage`
- **Repository**: `ChatRepository.createMessage`

## 6) Production best practices checklist

- [x] Runtime env config normalization (`config/env.ts`)
- [x] Payload validation helpers (`shared/validation/socket-schemas.ts`)
- [x] Centralized error mapping (`socket/socket-error-wrapper.ts`)
- [x] Structured logging facade (`config/logger.ts`)
- [x] DI-friendly composition root (`socket/register-handlers.ts`)
- [ ] Add JWT or session token handshake middleware for stronger auth
- [ ] Add Redis adapter for horizontal scaling
- [ ] Add rate limiting and audit logs
- [ ] Add unit tests and integration socket tests

## 7) Scaling strategy

- Use `@socket.io/redis-adapter` so rooms/events sync across Node instances.
- Deploy behind sticky sessions (or session affinity) when using stateful handshake.
- Keep socket identity in shared store (Redis) if multi-instance.
- Emit idempotent events and avoid in-memory-only critical state.

