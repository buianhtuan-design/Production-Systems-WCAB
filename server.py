#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AJAX PROPLAN MES - SERVER WITH LIVE GOOGLE SHEETS AUTO-SYNC
Serves the web app on port 8088 and provides:
1. /api/sync endpoint for on-demand sync from Google Sheets
2. /api/status endpoint to check last sync time
3. Background daemon thread that auto-syncs every 5 minutes
"""

import http.server
import json
import os
import sys
import threading
import time

from sync_service import sync_datamass

PORT = 8088
SYNC_INTERVAL_SECONDS = 300  # 5 minutes
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))

is_syncing_lock = threading.Lock()

def background_sync_worker():
    time.sleep(10)  # Chờ 10 giây sau khi khởi động trước khi bắt đầu chu kỳ đầu tiên
    while True:
        try:
            print(f"[{time.strftime('%H:%M:%S')}] [Auto-Sync] Bắt đầu tự động đồng bộ Google Sheets...")
            with is_syncing_lock:
                import importlib
                import sync_service
                importlib.reload(sync_service)
                res = sync_service.sync_datamass()
            print(f"[{time.strftime('%H:%M:%S')}] [Auto-Sync] ✅ Thành công! Cập nhật {res.get('items_count')} models trong {res.get('total_seconds')}s.")
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] [Auto-Sync] ⚠️ Lỗi đồng bộ: {e}")
        time.sleep(SYNC_INTERVAL_SECONDS)

class AppRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/sync' or self.path.startswith('/api/sync?'):
            self.handle_api_sync()
        elif self.path == '/api/sync-clips' or self.path.startswith('/api/sync-clips?'):
            self.handle_api_sync_clips()
        elif self.path == '/api/sync-kpi' or self.path.startswith('/api/sync-kpi?'):
            self.handle_api_sync_kpi()
        elif self.path == '/api/status' or self.path.startswith('/api/status?'):
            self.handle_api_status()
        elif self.path == '/api/completed-plan' or self.path.startswith('/api/completed-plan?'):
            self.handle_api_get_completed_plan()
        elif self.path == '/api/users' or self.path.startswith('/api/users?'):
            self.handle_api_get_users()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/completed-plan' or self.path.startswith('/api/completed-plan?'):
            self.handle_api_post_completed_plan()
        elif self.path == '/api/users' or self.path.startswith('/api/users?'):
            self.handle_api_post_users()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def end_headers(self):
        # Tuyệt đối không lưu cache các API hoặc file code/data để mọi thay đổi lập tức có hiệu lực
        clean_path = self.path.split('?')[0].lower()
        if clean_path.startswith('/api/') or clean_path.endswith(('.js', '.json', '.html', '.css')) or clean_path == '/' or clean_path == '':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def handle_api_sync(self):
        try:
            with is_syncing_lock:
                import importlib
                import sync_service
                importlib.reload(sync_service)
                res = sync_service.sync_datamass()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            err_data = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(err_data, ensure_ascii=False).encode('utf-8'))

    def handle_api_sync_clips(self):
        try:
            import urllib.parse
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            target_month = params.get('month', ['2026-11'])[0]
            month_label = params.get('label', [f"Tháng {target_month}"])[0]
            period_name = params.get('period', ['01/Nov - 30/Nov'])[0]

            with is_syncing_lock:
                import importlib
                import sync_service
                importlib.reload(sync_service)
                res = sync_service.sync_clips_alls_only(
                    target_month=target_month,
                    period_name=period_name,
                    month_label=month_label
                )
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            err_data = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(err_data, ensure_ascii=False).encode('utf-8'))

    def handle_api_sync_kpi(self):
        try:
            with is_syncing_lock:
                import importlib
                import sync_service
                importlib.reload(sync_service)
                res = sync_service.sync_kpi_only()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            err_data = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(err_data, ensure_ascii=False).encode('utf-8'))

    def handle_api_status(self):
        status_file = os.path.join(WORKSPACE_DIR, 'sync_status.json')
        data = {'running': True, 'interval_minutes': SYNC_INTERVAL_SECONDS // 60}
        if os.path.exists(status_file):
            try:
                with open(status_file, 'r', encoding='utf-8') as f:
                    data.update(json.load(f))
            except:
                pass
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def handle_api_get_completed_plan(self):
        latest_file = os.path.join(WORKSPACE_DIR, 'assembly_completed_plan_latest.json')
        history_file = os.path.join(WORKSPACE_DIR, 'assembly_plan_history.json')
        latest_plan = None
        history = []
        if os.path.exists(latest_file):
            try:
                with open(latest_file, 'r', encoding='utf-8') as f:
                    latest_plan = json.load(f)
            except Exception as e:
                print(f"[Error reading latest plan]: {e}")
        if os.path.exists(history_file):
            try:
                with open(history_file, 'r', encoding='utf-8') as f:
                    history = json.load(f)
                if not isinstance(history, list):
                    history = []
            except Exception as e:
                print(f"[Error reading plan history]: {e}")

        data = {
            'success': True,
            'hasPlan': latest_plan is not None,
            'latestPlan': latest_plan,
            'history': history,
            'serverTime': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def handle_api_post_completed_plan(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            payload = json.loads(body)
            plan = payload.get('plan') or payload
            if not plan:
                raise ValueError("Payload missing plan object")

            latest_file = os.path.join(WORKSPACE_DIR, 'assembly_completed_plan_latest.json')
            history_file = os.path.join(WORKSPACE_DIR, 'assembly_plan_history.json')

            # Lưu bản mới nhất (atomic write để tránh đọc dở khi polling)
            latest_tmp = latest_file + '.tmp'
            with open(latest_tmp, 'w', encoding='utf-8') as f:
                json.dump(plan, f, ensure_ascii=False, indent=2)
            os.replace(latest_tmp, latest_file)

            # Cập nhật danh sách lịch sử
            history = []
            if os.path.exists(history_file):
                try:
                    with open(history_file, 'r', encoding='utf-8') as f:
                        history = json.load(f)
                    if not isinstance(history, list):
                        history = []
                except:
                    history = []

            # Tránh trùng id
            history = [h for h in history if h.get('id') != plan.get('id')]
            history.insert(0, plan)
            history = history[:50]  # Giữ tối đa 50 bản ghi lịch sử

            history_tmp = history_file + '.tmp'
            with open(history_tmp, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
            os.replace(history_tmp, history_file)

            # Tự động đẩy bản kế hoạch vừa hoàn thành lên GitHub ở background để User truy cập GitHub Pages cũng đồng bộ được
            def _push_completed_plan_async():
                try:
                    from github_sync_helper import auto_push_data_to_github
                    auto_push_data_to_github()
                except Exception as push_err:
                    print(f"[Completed Plan GitHub Sync] ⚠️ {push_err}")

            threading.Thread(target=_push_completed_plan_async, daemon=True).start()

            res = {
                'success': True,
                'id': plan.get('id'),
                'planner': plan.get('planner'),
                'savedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
                'githubSyncStarted': True,
                'message': 'Đã lưu và đồng bộ kế hoạch thành công lên máy chủ!'
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            err_data = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(err_data, ensure_ascii=False).encode('utf-8'))

    def handle_api_get_users(self):
        users_file = os.path.join(WORKSPACE_DIR, 'users_config.json')
        users = []
        if os.path.exists(users_file):
            try:
                with open(users_file, 'r', encoding='utf-8') as f:
                    users = json.load(f)
                if not isinstance(users, list):
                    users = []
            except Exception as e:
                print(f"[Error reading users]: {e}")

        # Nếu file rỗng thì nạp default
        if not users:
            users = [
                {
                    "username": "admin",
                    "fullName": "Bùi Anh Tuấn (Admin)",
                    "role": "admin",
                    "password": "admin123",
                    "createdAt": time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                    "description": "Quản trị viên tối cao, toàn quyền hệ thống"
                },
                {
                    "username": "planner",
                    "fullName": "Nguyễn Văn Lập (Kế Hoạch)",
                    "role": "editor",
                    "password": "editor123",
                    "createdAt": time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                    "description": "Chuyên viên lập kế hoạch & phân bổ chuyền sản xuất"
                },
                {
                    "username": "viewer",
                    "fullName": "Khách Tham Quan (Viewer)",
                    "role": "viewer",
                    "password": "viewer123",
                    "createdAt": time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                    "description": "Tài khoản tra cứu tiến độ và sản lượng, chỉ xem"
                }
            ]
            try:
                with open(users_file, 'w', encoding='utf-8') as f:
                    json.dump(users, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"[Error writing default users]: {e}")

        data = {
            'success': True,
            'users': users,
            'serverTime': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def handle_api_post_users(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            payload = json.loads(body)
            action = payload.get('action', 'save')  # create, update, delete, save_all

            users_file = os.path.join(WORKSPACE_DIR, 'users_config.json')
            current_users = []
            if os.path.exists(users_file):
                try:
                    with open(users_file, 'r', encoding='utf-8') as f:
                        current_users = json.load(f)
                    if not isinstance(current_users, list):
                        current_users = []
                except:
                    current_users = []

            if action == 'create':
                new_user = payload.get('user')
                if not new_user or not new_user.get('username'):
                    raise ValueError("Thiếu thông tin tên đăng nhập (username)!")
                raw_uname = str(new_user['username']).strip()
                uname_check = raw_uname.lower()
                # Kiểm tra trùng username (không phân biệt hoa thường)
                if any(u.get('username', '').strip().lower() == uname_check for u in current_users):
                    raise ValueError(f"Tên đăng nhập '{raw_uname}' đã tồn tại trên hệ thống!")

                user_obj = {
                    "username": raw_uname,
                    "fullName": (new_user.get('fullName') or raw_uname).strip(),
                    "role": new_user.get('role', 'editor').strip().lower(),
                    "password": (new_user.get('password') or '123456').strip(),
                    "createdAt": time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                    "description": (new_user.get('description') or '').strip()
                }
                current_users.append(user_obj)

            elif action == 'update':
                updated_user = payload.get('user')
                if not updated_user or not updated_user.get('username'):
                    raise ValueError("Thiếu thông tin tên đăng nhập (username) để cập nhật!")
                uname_target = str(updated_user['username']).strip().lower()
                found = False
                for u in current_users:
                    if u.get('username', '').strip().lower() == uname_target:
                        if updated_user.get('fullName'): u['fullName'] = updated_user['fullName'].strip()
                        if updated_user.get('role'): u['role'] = updated_user['role'].strip().lower()
                        if updated_user.get('password'): u['password'] = updated_user['password'].strip()
                        if 'description' in updated_user: u['description'] = updated_user['description'].strip()
                        u['updatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                        found = True
                        break
                if not found:
                    raise ValueError(f"Không tìm thấy người dùng '{updated_user['username']}'!")

            elif action == 'delete':
                uname_del = str(payload.get('username', '')).strip().lower()
                if not uname_del:
                    raise ValueError("Thiếu tên đăng nhập cần xóa!")
                if uname_del == 'admin':
                    raise ValueError("Không thể xóa tài khoản Quản trị viên tối cao (admin)!")
                current_users = [u for u in current_users if u.get('username', '').strip().lower() != uname_del]

            elif action == 'save_all':
                all_users = payload.get('users')
                if isinstance(all_users, list):
                    current_users = all_users

            with open(users_file, 'w', encoding='utf-8') as f:
                json.dump(current_users, f, ensure_ascii=False, indent=2)

            res = {
                'success': True,
                'message': 'Đã cập nhật danh sách người dùng thành công!',
                'users': current_users
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            err_data = {'success': False, 'error': str(e)}
            self.wfile.write(json.dumps(err_data, ensure_ascii=False).encode('utf-8'))

def main():
    sync_thread = threading.Thread(target=background_sync_worker, daemon=True)
    sync_thread.start()

    server_address = ('0.0.0.0', PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, AppRequestHandler)
    print("=" * 65)
    print("🚀 AJAX PROPLAN MES - MÁY CHỦ WEB TỰ ĐỘNG ĐỒNG BỘ GOOGLE SHEETS")
    print(f"📡 Địa chỉ truy cập nội bộ (Mac):   http://localhost:{PORT}")
    print(f"📱 Địa chỉ truy cập qua Wi-Fi (LAN): http://192.168.1.249:{PORT}")
    print(f"🔄 Chu kỳ tự động đồng bộ ngầm:     Mỗi {SYNC_INTERVAL_SECONDS // 60} phút / lần")
    print(f"⚡ Endpoint đồng bộ tức thì:        http://localhost:{PORT}/api/sync")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐang dừng máy chủ...")
        httpd.server_close()

if __name__ == '__main__':
    main()
