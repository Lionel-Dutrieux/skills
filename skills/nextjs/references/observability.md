# Observability

Logs go to stdout as JSON, traces leave as OTLP. The apps never name the backend that
receives them (SigNoz, today).

## The logger

With Payload embedded, the app logs through Payload's logger, pino already:
`req.payload.logger` in hooks, tasks and endpoints, `payload.logger` in the DAL, the
actions and `instrumentation.ts`. An app without Payload (the headless front) has its own:

```ts
// src/lib/logger.ts
import 'server-only'

import pino from 'pino'

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
})
```

`pino-pretty` is a devDependency. Next.js keeps `pino` out of its bundle by default.

## `src/instrumentation.ts`

```ts
import type { Instrumentation } from 'next'

export const register = async () => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { registerOTel } = await import('@vercel/otel')
  const { PinoInstrumentation } = await import('@opentelemetry/instrumentation-pino')
  registerOTel({ serviceName: 'web', instrumentations: ['fetch', new PinoInstrumentation()] })
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { logger } = await import('@/lib/logger')
  logger.error({ err: error, path: request.path, route: context.routePath }, 'Request failed')
}
```

`PinoInstrumentation` adds `trace_id` and `span_id` to every log line, linking each log to
its trace.

## Unexpected errors

Two places catch them, and each logs once:

- **`handleServerError`** of the action clients, which also records the error on the
  active span (`references/mutations.md`).
- **`onRequestError`**, for rendering and route handlers.

An expected error (a code returned to the UI) is not logged as an error.

## Readable stack traces

`next.config.ts` turns on `experimental.serverSourceMaps`, and the Docker image
runs Node with `NODE_OPTIONS=--enable-source-maps`: a stack points at `src/`, not at a
bundled chunk.

## Environment

| Variable | Value |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | The collector's OTLP/HTTP endpoint |
| `LOG_LEVEL` | `info` in production, `debug` while investigating |
