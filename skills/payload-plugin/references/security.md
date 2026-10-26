# Tenants, links and endpoints

The rules the stabilization of the plugins taught, each one a hole that was found and
closed. The kit's README details every helper named here.

## Data per tenant

- **A plugin's document keeps its tenant as text**, and the host's `access` scopes it.
  Payload checks no `Where` on `create`, and `update` matches the document as stored: the
  plugin's tenant field carries the kit's `ownTenantOnWrite`, which refuses a tenant the
  user may not use (`mayUseTenant`). A host picking the tenant itself does so in the
  field's `defaultValue`.
- **What is global stays global.** A collection the plugin keeps for every tenant (the
  OIDC identities) is left out of the multi-tenant plugin's `collections`, and the plugin
  refuses to start when it is scoped, saying why.
- **Tenant domains are read through the kit** (`tenantForHost`, `primaryDomainOf`,
  `isTrustedHost`), never by depending on the tenant-domains plugin: without it, every
  helper answers as if no domain were declared.
- **Tested on `test/int/multi-tenant-config.ts`**: a tenant's admin reads and writes in
  their tenant only, and a write into another tenant is a 403.

## Links and origins

A URL the plugin sends away — an email link, a `redirect_uri`, a revalidation target — is
built on `serverURL`, or on a `Host` a tenant declared as its domain (`isTrustedHost`,
`trustedHostOrigin`). The `Host` header alone is whoever sends the request's to choose,
and `X-Forwarded-Host` any client's: neither names an origin. With neither `serverURL` nor
a declared domain, the flow is refused, and the plugin says so at boot.

## Endpoints

- **Act as the user.** A Local API call on their behalf passes `req` and
  `overrideAccess: false`; nested operations pass `req`, to join the transaction.
- **A JSON body needs `Content-Type: application/json`.** A cross-site form can post
  `text/plain` with cookies; it cannot post JSON.
- **The client gets a code.** A refusal is an `APIError` with its status and a translated
  message; an unexpected failure is logged in full and answered with a generic message.
- **What sends is rate limited** — a test email, a test notification — with
  `Retry-After` on the 429.
