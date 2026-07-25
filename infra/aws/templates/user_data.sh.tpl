#!/bin/bash
set -euxo pipefail

# ── Node.js 20 + git + PM2 + agente SSM (esta AMI no lo trae preinstalado) ───
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs git amazon-ssm-agent
systemctl enable --now amazon-ssm-agent
npm install -g pm2

# ── Agente de CloudWatch para logs ────────────────────────────────────────────
dnf install -y amazon-cloudwatch-agent
cat <<'CWCONFIG' > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/.pm2/logs/alertacomunal-out.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/out"
          },
          {
            "file_path": "/home/ec2-user/.pm2/logs/alertacomunal-error.log",
            "log_group_name": "${log_group_name}",
            "log_stream_name": "{instance_id}/error"
          }
        ]
      }
    }
  }
}
CWCONFIG
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# ── Swap de emergencia ────────────────────────────────────────────────────────
# t3.small tiene solo 2GB de RAM y `npm run build` puede acercarse a ese límite
# (más aún con webpack plugins adicionales, ej. @sentry/nextjs) — sin swap, un
# pico de memoria mata el proceso de build con OOM killer en vez de solo ir más
# lento, y el build nunca llega a `pm2 start`.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── Código de la app (primero, en directorio vacío) ──────────────────────────
APP_DIR=/opt/alertacomunal
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  git fetch origin "${app_repo_branch}"
  git reset --hard "origin/${app_repo_branch}"
else
  git clone --branch "${app_repo_branch}" --single-branch "${app_repo_url}" .
fi

# ── Variables de entorno desde SSM Parameter Store ───────────────────────────
aws ssm get-parameters-by-path \
  --path "${ssm_prefix}" \
  --with-decryption \
  --region "${aws_region}" \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output json \
  | python3 -c "
import json, sys
params = json.load(sys.stdin)
with open('.env.production.local', 'w') as f:
    for p in params:
        key = p['Name'].split('/')[-1]
        value = p['Value'].replace(chr(10), '\\\\n')
        f.write(f'{key}={value}\n')
"

chown -R ec2-user:ec2-user "$APP_DIR"

sudo -u ec2-user bash <<'DEPLOY'
set -euxo pipefail
cd /opt/alertacomunal
npm ci
npx prisma generate
# BUILD_ID estable por commit — ver comentario en next.config.ts. Todas las
# instancias del ASG que arranquen sobre el mismo commit terminan con
# nombres de chunk idénticos, así que cualquiera puede servir los assets de
# cualquier otra sin 404 cruzados.
export NEXT_BUILD_ID="$(git rev-parse HEAD)"
npm run build
pm2 delete alertacomunal || true
pm2 start ecosystem.config.js --env production
pm2 save
DEPLOY

# PM2 arranca solo si la instancia reinicia
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
systemctl enable pm2-ec2-user
