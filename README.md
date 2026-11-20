# FREEDOM

**Break the Habit. Reclaim Your Life.**

FREEDOM is a free, judgment-free recovery education website with guided urge support, personal check-ins, a recovery companion, community resources, feedback and an AI assistant named Ruby.

## Hosting and deployment
- Existing site URL: `https://freedom-e0i.pages.dev` (the Wrangler `name` is `freedom`; the Pages hostname has its own project slug)
- Git repository: `robinson2kk/freedom`, branch `main`
- Existing D1 database binding: `DB`, database name `freedom-db`
- Pages output directory: repository root

GitHub changes are source changes. They become live only after the connected Cloudflare Pages deployment succeeds.

## Database migrations
After pulling latest `main`, apply pending migrations to the existing remote database from the repository root:

```bash
npx wrangler login
npx wrangler d1 migrations apply freedom-db --remote
```

Skip the login command if Wrangler is already authenticated. Confirm the target account/database before applying. Migration `010_companion_feedback.sql` creates the feedback queue and rate-limit table; it does not reset existing data.

## Ruby AI setup
Ruby's Pages Function uses the Cloudflare Workers AI binding `env.AI`. For Pages Functions, add this binding in the Cloudflare dashboard:
1. Open Workers & Pages → select the Pages project serving `freedom-e0i.pages.dev`.
2. Open Settings → Functions → Bindings.
3. Add a Workers AI binding named `AI`.
4. Save and trigger a new production deployment.

The Ruby API uses `@cf/zai-org/glm-4.7-flash`. If the binding is absent, the endpoint returns a temporary-unavailable response; no API key is exposed in browser code.

## Local development
Use a recent Node.js release and Wrangler:

```bash
npx wrangler pages dev .
```

For full local API testing, configure a local D1 database and Workers AI binding using Cloudflare's current Pages documentation.

## Privacy and safety
- Guest check-ins and companion goals are stored in the visitor's browser.
- Signed-in check-ins are stored in the existing private D1 account.
- Ruby chat history is held in the page while open and is not persisted by the FREEDOM endpoint; Cloudflare Workers AI processes prompts to generate replies.
- Feedback is stored in D1 for authorised administrator review.
- FREEDOM is educational self-help, not diagnosis, treatment or emergency care.
- Anyone who may be physically dependent on alcohol should seek medical advice before stopping; withdrawal can be dangerous.
