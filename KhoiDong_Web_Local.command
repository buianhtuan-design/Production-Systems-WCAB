#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/com.ajaxproplan.mes.server.plist"
UID_NUM="$(id -u)"

echo "============================================================"
echo "  AJAX PROPLAN MES - KHOI DONG & TU CHAY NEN WEB LOCAL"
echo "============================================================"

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ajaxproplan.mes.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-u</string>
    <string>${APP_DIR}/server.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${APP_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${APP_DIR}/server.log</string>
  <key>StandardErrorPath</key>
  <string>${APP_DIR}/server.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PYTHONUNBUFFERED</key>
    <string>1</string>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF

# Dung tien trinh server.py cu neu dang chiem cong 8088
OLD_PIDS=$(lsof -ti :8088 2>/dev/null || true)
if [ -n "$OLD_PIDS" ]; then
  echo "Dang dung tien trinh cu tren cong 8088: $OLD_PIDS"
  kill $OLD_PIDS 2>/dev/null || true
  sleep 1
fi

launchctl bootout "gui/${UID_NUM}/com.ajaxproplan.mes.server" 2>/dev/null || true
launchctl bootstrap "gui/${UID_NUM}" "$PLIST_PATH"
sleep 2

if lsof -i :8088 >/dev/null 2>&1; then
  echo "OK! Web Local da chay nen & tu khoi dong khi mo may:"
  echo "  -> http://localhost:8088"
  if [ "$1" != "--no-open" ]; then
    open "http://localhost:8088" 2>/dev/null || true
  fi
else
  echo "Kiem tra server.log neu cong 8088 chua mo:"
  tail -n 20 "${APP_DIR}/server.log" 2>/dev/null || true
fi
