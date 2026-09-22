Case Management Platform — Linux PM2 deploy (local PostgreSQL)
==============================================================

Install root (recommended): /var/www/case-management

One-time server steps
---------------------
1. Unzip this folder flat into the install root.
2. Run:

     cd /var/www/case-management
     sudo bash start.sh

That is the full local-DB bootstrap:

  - deploy/.env from deploy/.env.example (auto JWT + Postgres passwords)
  - Node 20+, Python venv, PM2, PostgreSQL (apt) if missing
  - PostgreSQL service start + role/database from deploy/.env
  - React build, PM2 → uvicorn on 127.0.0.1:4510
  - API creates tables and seeds demo data on first startup
  - nginx skipped until PUBLIC_HOST and SSL paths are set

Optional after reboot (once per server):

  pm2 startup    # run the sudo command it prints
  pm2 save

URLs (defaults)
---------------
  App:    http://127.0.0.1:4510/case-management/
  API:    http://127.0.0.1:4510/case-management/api
  Health: http://127.0.0.1:4510/case-management/api/health

Demo login password: SEED_USER_PASSWORD in deploy/.env (default ChangeMe123!)

Public HTTPS (demo default)
---------------------------
Default in deploy/.env.example:

  https://client-demo.inapp.com/case-management/

Nginx uses a snippet on the shared vhost (like FWA):

  /etc/nginx/snippets/case-management.conf

First install or path/cert change:

  sudo bash start.sh

Routine code updates (keep nginx as-is):

  bash start.sh --no-nginx

Updates
-------
  Unzip new files over the install root, then:

     bash start.sh --no-nginx

Use --no-build only if web/dist is already built in the zip.

Line endings
------------
Package with deploy/create-archive.sh (Git Bash) so .sh files use LF.

More detail: deploy/README-DEPLOY.md
