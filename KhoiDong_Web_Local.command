#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "============================================================"
echo "  AJAX PROPLAN MES - KHOI DONG WEB LOCAL (PORT 8088)"
echo "============================================================"

# Dung tien trinh cu tren cong 8088 neu co
OLD_PIDS=$(lsof -ti :8088 2>/dev/null || true)
if [ -n "$OLD_PIDS" ]; then
  echo "Dang khoi dong lai Web Local (dung PID cu: $OLD_PIDS)..."
  kill $OLD_PIDS 2>/dev/null || true
  sleep 1
fi

nohup /usr/bin/python3 -u "${APP_DIR}/server.py" > "${APP_DIR}/server.log" 2>&1 < /dev/null &
SERVER_PID=$!

for i in 1 2 3 4 5 6; do
  if lsof -i :8088 >/dev/null 2>&1; then
    echo "OK! Web Local da san sang (PID: ${SERVER_PID}):"
    echo "  -> Tren may Mac: http://localhost:8088"
    if [ "$1" != "--no-open" ]; then
      open "http://localhost:8088" 2>/dev/null || true
    fi
    exit 0
  fi
  sleep 0.5
done

echo "Canh bao: Chua thay cong 8088 mo. Kiem tra server.log:"
tail -n 20 "${APP_DIR}/server.log" 2>/dev/null || true
exit 1
