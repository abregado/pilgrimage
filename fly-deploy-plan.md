# Fly.io Deployment Plan

Deploy Verdant to Fly.io automatically on every push to `main`.

---

## What you need to do once (manual setup)

### 1. Install flyctl

```
powershell -c "iwr https://fly.io/install.ps1 -useb | iex"
```

Or on Mac/Linux:

```
curl -L https://fly.io/install.sh | sh
```

### 2. Log in

```
flyctl auth login
```

### 3. Launch the app (first time only)

From the project root:

```
flyctl launch --no-deploy
```

- Choose an app name (e.g. `verdant-game`)
- Choose a region close to your users (e.g. `lhr` for London, `iad` for US East)
- Say **no** to adding a database
- Say **no** to deploying now

This creates `fly.toml`.

### 4. Create a persistent volume for game state

The server saves state to `server/data/state.json`. Without a volume this resets on every deploy.

```
flyctl volumes create verdant_data --size 1 --region lhr
```

Replace `lhr` with your chosen region. 1 GB is more than enough.

### 5. Add the FLY_API_TOKEN secret to GitHub

```
flyctl tokens create deploy -x 999999h
```

Copy the token, then go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**.

Name: `FLY_API_TOKEN`
Value: the token you just copied.

---

## Files to create in the project

### `Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p server/data
EXPOSE 3000
CMD ["node", "server/index.js"]
```

### `fly.toml`

Replace `your-app-name` and `lhr` with your actual values:

```toml
app = 'your-app-name'
primary_region = 'lhr'

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 256

[mounts]
  source = 'verdant_data'
  destination = '/app/server/data'
```

`auto_stop_machines = 'stop'` means Fly.io will stop the machine when no one is connected and start it again on the next request. This keeps costs at zero when idle.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    concurrency: deploy-group
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

`concurrency: deploy-group` ensures only one deploy runs at a time if you push rapidly.

---

## After setup: verify it works

```
flyctl deploy
flyctl open
```

The app should open in your browser. Check logs with:

```
flyctl logs
```

---

## Notes

- **State persistence**: The volume at `/app/server/data` persists across deploys and machine restarts. Make sure your `server/persistence.js` writes to a path under `server/data/`.
- **WebSockets**: Fly.io proxies WebSockets correctly with no extra config needed.
- **Costs**: With `min_machines_running = 0` and `auto_stop_machines = 'stop'`, you only pay while the machine is actually running. A shared-cpu-1x 256 MB machine costs roughly $0.000007/second when active.
- **Custom domain**: Run `flyctl certs add yourdomain.com` and point your DNS to Fly.io after the first deploy.
- **Secrets**: If you add any env-var secrets later, use `flyctl secrets set KEY=VALUE`.
