#!/bin/sh
# Historical HTTPS-only hook; removed from deploy hooks in HTTP mode (1.31.0).
# Restore as /etc/letsencrypt/renewal-hooks/deploy/90-word-mahjong only when reverting to HTTPS.
# A stable Caddyfile does not imply its externally loaded certificate is unchanged.
set -eu
[ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/daweiba-control-ip ] || exit 0
install -m 644 "$RENEWED_LINEAGE/fullchain.pem" /etc/word-mahjong/public-chain.pem
install -m 640 -o root -g word-mahjong "$RENEWED_LINEAGE/privkey.pem" /etc/word-mahjong/public-key.pem
/usr/bin/caddy validate --config /etc/word-mahjong/Caddyfile --adapter caddyfile >/dev/null
if systemctl is-active --quiet word-mahjong-caddy; then
 /usr/bin/caddy reload --config /etc/word-mahjong/Caddyfile --adapter caddyfile --address 127.0.0.1:2021 --force >/dev/null
fi
