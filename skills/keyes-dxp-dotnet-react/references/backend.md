# ASP.NET Core backend

The server half of the stack. The React client's table and rules live in `SKILL.md`; the
generated client that binds the two lives in `references/api-contract.md`.

## Need → library

| Need | Use | Do NOT use |
|---|---|---|
| Target framework | .NET 10, `Nullable` and `ImplicitUsings` enabled, `TreatWarningsAsErrors` in `Directory.Build.props` | per-project settings that drift, warnings left to accumulate |
| HTTP API style | **Minimal APIs**, grouped per resource in endpoint classes (`MapCustomerEndpoints`) mapped from `Program.cs` | MVC controllers, one `Program.cs` that maps every route inline |
| ORM | **EF Core 10** (SQL Server provider), registered with `AddDbContextPool` | Dapper or raw ADO.NET as the default path, `AddDbContext` when the context takes only its options |
| Migrations | EF Core migrations, applied by a **deployment step** | `Database.Migrate()` at startup, `EnsureCreated()` |
| Background jobs / scheduling | **Hangfire** (SQL Server storage), schema prepared by a deployment step | a hand-rolled `BackgroundService` loop for recurring work, Quartz |
| Authentication | **Microsoft.Identity.Web** — Entra ID, JWT bearer | a self-issued JWT, a full local ASP.NET Core Identity install |
| Break-glass / local account | a second authentication scheme on a cookie (HttpOnly, SameSite=Strict, Secure), selected by a policy scheme | a second self-issued token, an environment-variable backdoor |
| Authorization | policies + requirements/handlers, resolved from the user's role | claim checks scattered across endpoints, permissions derived from Entra groups |
| Input validation | FluentValidation | DataAnnotations on request DTOs, `if (string.IsNullOrEmpty(...)) return BadRequest()` |
| OpenAPI document | `Microsoft.AspNetCore.OpenApi`, written to disk by a CLI mode of the API | Swashbuckle, NSwag, a document hand-maintained beside the code |
| API documentation UI | Scalar (`Scalar.AspNetCore`), behind a development-only guard | Swagger UI, an unguarded doc endpoint in production |
| Error responses | `ProblemDetails` (RFC 7807) with a stable `errorCode` extension | bare strings, anonymous objects, an exception message on the wire |
| Unit tests | xunit.v3 + Shouldly | MSTest, NUnit, FluentAssertions |
| Integration tests | `WebApplicationFactory` + Testcontainers against a real SQL Server | an in-memory provider, a shared developer database |
| Architecture rules | NetArchTest, when the solution has layers worth pinning | a convention documented in a README and nowhere else |
| API documentation for humans | `///` XML comments + `GenerateDocumentationFile`, rendered by the docs site | a reference page maintained by hand next to the code |

**Project layout is deliberately still open.** Whether a solution is one WebApi project or
split into `Domain` / `Application` / `Infrastructure` / `WebApi` (+ `Jobs`, `Modules`) is a
per-project call today. Follow what the solution already does; `Keyes-CSP` is the most
advanced example the team has and its `CLAUDE.md` is worth reading before designing anything
server-side. Ask before importing its layout wholesale into another solution.

## Hard rules

**No schema is ever created at startup.** Not EF migrations, not the Hangfire tables
(`PrepareSchemaIfNecessary = false`). Several instances preparing the schema at the same time
is a known source of SQL Server deadlocks — and an app that migrates on boot cannot be rolled
back. Schema changes are a deployment step, invoked explicitly.

**Reads are projections.** `AsNoTracking` on every read (change tracking only serves writes),
project to a DTO instead of returning an entity, and cap every list server-side. A list
endpoint with no page-size ceiling works until the day it does not. Response time is a
permanent constraint, not a pass to do at the end.

**Environment guards are allowlists.** Test `IsDevelopment()`, never `!IsProduction()` — a
"Staging" slot exposed to the internet is not `IsProduction()`, and that is exactly how a fake
data source or an unguarded `/scalar` reaches the open web.

**Authorization comes from the role, server-side, on every request.** Never from an Entra
group claim, never from configuration, never trusted from the client. What the SPA computes is
a display convenience.

**The error contract is public.** An `errorCode` string is consumed by the SPA; renaming one
is an API break, not a refactor. → `references/api-contract.md`

**Nullable reference types and warnings-as-errors are contract settings, not style.** They are
what makes the generated TypeScript mark a property required rather than optional. Turning
either off silently degrades every client.
