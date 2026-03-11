# Cloud Run deployment (Litestream + GCS)

This repository includes automated Cloud Run deployment in
`.github/workflows/deploy-cloud-run.yml`.

## What the deploy workflow does

On every push to `main`:

1. Authenticates to GCP using `secrets.GCP_SA_KEY`.
2. Builds the Docker image from `Dockerfile`.
3. Pushes the image to Artifact Registry.
4. Deploys the image to Cloud Run.

The container startup script restores SQLite from GCS using Litestream (if a
replica exists) and then runs the app under continuous replication back to GCS.

## Required GitHub repository variables

Set these variables in `Settings -> Secrets and variables -> Actions -> Variables`:

- `GCP_PROJECT_ID` (e.g. `my-project`)
- `GCP_REGION` (e.g. `us-central1`)
- `GAR_REPOSITORY` (Artifact Registry repository name)
- `CLOUD_RUN_SERVICE` (Cloud Run service name)
- `APP_URL` (public app URL, e.g. `https://keybr.example.com/`)
- `COOKIE_DOMAIN` (cookie domain only, no scheme; usually `keybr.example.com`)
- `LITESTREAM_REPLICA_URI` (e.g. `gs://my-keybr-backups/database`)

Optional:

- `IMAGE_NAME` (defaults to `keybr-com`)
- `LITESTREAM_RETENTION` (defaults to `168h`)
- `CLOUD_RUN_EXTRA_ENV_VARS` (comma-separated `KEY=VALUE` list)
- `CLOUD_RUN_SECRETS` (comma-separated Cloud Run secret bindings, e.g.
  `MAIL_KEY=mail-key:latest`)
- `RUN_CLOUD_RUN_SMOKE_TEST` (`true` by default)

## Required GitHub repository secret

Set this in `Settings -> Secrets and variables -> Actions -> Secrets`:

- `GCP_SA_KEY`: service-account JSON key used by GitHub Actions to build/push
  images and deploy to Cloud Run.

## Runtime notes

- The deployment sets `--max-instances=1` to avoid multi-writer divergence with
  SQLite.
- Health endpoint: `GET /healthz` returns `200 OK` with `ok`.
- `LITESTREAM_REPLICA_URI` is a private GCS URI (`gs://...`) and does not need
  public access; the Cloud Run runtime identity needs bucket permissions.

## Variables vs secrets

Deployment configuration values are expected from Actions Variables. Only
`GCP_SA_KEY` is required as an Actions Secret.

## How to determine key values

- `GCP_PROJECT_ID`:
  `gcloud config get-value project`
- `GCP_REGION`:
  your Cloud Run region (for example, `us-central1`)
- `CLOUD_RUN_SERVICE`:
  `gcloud run services list --region <REGION>`
- `GAR_REPOSITORY`:
  `gcloud artifacts repositories list --location <REGION>`

## Persistence verification

After deployment:

1. Create or update data in the app.
2. Trigger another deployment (push to `main`).
3. Verify the record still exists after rollout.

## Automated smoke test

The deploy workflow runs `scripts/cloud-run-smoke-test.sh` after deployment
(unless `RUN_CLOUD_RUN_SMOKE_TEST=false`).

The smoke test validates:

1. `/healthz` returns `ok`
2. login via `/login/xyz` works
3. authenticated `PATCH /_/account` succeeds
4. `/account` reflects the updated user state
