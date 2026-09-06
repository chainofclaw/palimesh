#!/usr/bin/env bash
# Deploy the dual-variant website (palium.io + palimesh.io) to v3.
# 服务器上 /opt/coc 同目录跑着验证者(palimesh-node@88),所以只用 `git checkout origin/main -- website`
# 更新网站文件,绝不 checkout -f / reset / stash。旧进程在构建期间继续用旧 .next-* 提供服务,零停机。
#
# Usage:
#   ./scripts/deploy-website.sh                # 部署 origin/main 的 website/
#   PALI_WEBSITE_REF=origin/feat/x ./scripts/deploy-website.sh
# Env:
#   PALI_WEBSITE_HOST   default root@199.192.16.79 (v3)
#   PALI_WEBSITE_SSH_KEY default ~/.ssh/id_rsa
#   PALI_WEBSITE_REMOTE_DIR default /opt/coc
#   PALI_WEBSITE_REF    default origin/main
set -euo pipefail

HOST="${PALI_WEBSITE_HOST:-root@199.192.16.79}"
KEY="${PALI_WEBSITE_SSH_KEY:-$HOME/.ssh/id_rsa}"
REMOTE="${PALI_WEBSITE_REMOTE_DIR:-/opt/coc}"
REF="${PALI_WEBSITE_REF:-origin/main}"

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY (set PALI_WEBSITE_SSH_KEY)" >&2
  exit 1
fi

echo "==> $HOST: checkout $REF -- website, build both variants, restart both units"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" bash -s "$REMOTE" "$REF" <<'REMOTE'
set -euo pipefail
REMOTE_DIR="$1"; REF="$2"
cd "$REMOTE_DIR"
git fetch origin --quiet
git checkout "$REF" -- website            # 只动 website/,不动节点代码
cd website
npm install --no-audit --no-fund
npm run build                             # check:i18n → build:palium → build:palimesh
for unit in palimesh-website palium-website; do
  if systemctl list-unit-files | grep -q "^${unit}.service"; then
    systemctl restart "$unit"
    sleep 3
    systemctl is-active "$unit" >/dev/null || { echo "!! $unit failed to start"; journalctl -u "$unit" -n 30 --no-pager; exit 1; }
  else
    echo "!! $unit.service not installed — copy ops/systemd/${unit}.service to /etc/systemd/system and enable it"
  fi
done
curl -s -o /dev/null -w "palimesh :3001 -> %{http_code}\n" http://127.0.0.1:3001/zh
curl -s -o /dev/null -w "palium   :3004 -> %{http_code}\n" http://127.0.0.1:3004/zh
REMOTE

echo "==> done"
