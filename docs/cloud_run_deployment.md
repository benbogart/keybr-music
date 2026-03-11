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
- `COOKIE_DOMAIN` (e.g. `keybr.example.com`)
- `LITESTREAM_REPLICA_URL` (e.g. `gs://my-keybr-backups/database`)

Optional:

- `IMAGE_NAME` (defaults to `keybr-com`)
- `LITESTREAM_RETENTION` (defaults to `168h`)
- `CLOUD_RUN_EXTRA_ENV_VARS` (comma-separated `KEY=VALUE` list)
- `CLOUD_RUN_SECRETS` (comma-separated Cloud Run secret bindings, e.g.
  `MAIL_KEY=mail-key:latest`)

## Required GitHub repository secret

Set this in `Settings -> Secrets and variables -> Actions -> Secrets`:

- `GCP_SA_KEY`: service-account JSON key used by GitHub Actions to build/push
  images and deploy to Cloud Run.

## Runtime notes

- The deployment sets `--max-instances=1` to avoid multi-writer divergence with
  SQLite.
- Health endpoint: `GET /healthz` returns `200 OK` with `ok`.

## Persistence verification

After deployment:

1. Create or update data in the app.
2. Trigger another deployment (push to `main`).
3. Verify the record still exists after rollout.
