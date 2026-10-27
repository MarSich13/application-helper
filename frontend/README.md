# Application Helper client

React 19, TypeScript, Vite, React Router and Lucide icons.

See the [root README](../README.md) for setup, demo credentials and the complete verification workflow.

```sh
npm ci
npm run dev
npm run lint
npm run build
npm run test:e2e
```

The Vite development proxy forwards `/api` to Spring Boot on port 8080. The Docker build serves the production bundle through Nginx and proxies to the backend container.

`npm run screenshots` captures the opt-in demo workspace for the README. It requires a running application and Playwright Chromium. Set `E2E_BASE_URL` to capture the Docker application.
