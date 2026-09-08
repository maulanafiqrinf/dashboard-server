#!/usr/bin/env python3
"""
Semen Indonesia Cooperative - Multi-Service Intranet Monitoring Agent (Python 3)
Memantau banyak aplikasi dan port di server intranet 172.20.110.20
secara otomatis dan mengirimkan laporan batch ke Dashboard Cloud Vercel.
"""

import sys
import os
import time
import json
import ssl
import socket
import argparse
import urllib.request
import urllib.error

# DEFAULT CONFIGURATION
DEFAULT_DASHBOARD_URL = "https://dashboard-server.vercel.app"
DEFAULT_SECRET_KEY = "kwsg-intranet-agent-key-2026"
DEFAULT_INTERVAL_SEC = 1800  # 30 Menit (Corporate Default)

# DAFTAR TARGET DEFAULT SERVER 172.20.110.20
LOCAL_MONITORS = [
    {
        "name": "HRD Online (Server 20)",
        "target": "http://172.20.110.20/hrdonline",
        "category": "web",
        "type": "http",
        "timeout": 5
    },
    {
        "name": "Portal Intranet (Server 20)",
        "target": "http://172.20.110.20",
        "category": "web",
        "type": "http",
        "timeout": 5
    }
    # Tambahkan aplikasi lain di server 20 di sini jika diinginkan:
    # {"name": "Sistem Informasi Kepegawaian", "target": "http://172.20.110.20/sipk", "category": "web", "type": "http", "timeout": 5},
    # {"name": "Presensi Karyawan", "target": "http://172.20.110.20/absensi", "category": "web", "type": "http", "timeout": 5},
    # {"name": "MySQL Server 20", "target": "172.20.110.20", "port": 3306, "category": "database", "type": "tcp", "timeout": 3},
]

def fetch_cloud_targets(dashboard_url):
    endpoint = f"{dashboard_url.rstrip('/')}/api/agent/report"
    req = urllib.request.Request(
        endpoint,
        headers={"User-Agent": "KWSG-Intranet-Agent-Python/2.0", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode("utf-8"))
            targets = data.get("targets", [])
            if targets:
                print(f"[Auto-Sync] Mengunduh {len(targets)} target dari Dashboard Cloud")
                return targets
    except Exception:
        pass
    return []

def check_http(monitor):
    url = monitor["target"]
    if not (url.startswith("http://") or url.startswith("https://")):
        url = f"http://{url}"
    timeout = monitor.get("timeout", 5)

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "KWSG-Intranet-Agent-Python/2.0", "Accept": "*/*"},
        method=monitor.get("method", "GET")
    )

    start = time.perf_counter()
    status = "down"
    status_code = None
    error_msg = None

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            latency = round((time.perf_counter() - start) * 1000)
            status_code = response.getcode()
            expected = monitor.get("expectedStatusCode", 200)
            if status_code == expected or (200 <= status_code < 400):
                status = "degraded" if latency > 2500 else "operational"
            else:
                status = "down"
                error_msg = f"HTTP status {status_code}"
    except urllib.error.HTTPError as e:
        latency = round((time.perf_counter() - start) * 1000)
        status_code = e.code
        status = "down" if e.code >= 500 else "degraded"
        error_msg = f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        latency = round((time.perf_counter() - start) * 1000)
        status = "down"
        error_msg = str(e.reason)
    except Exception as e:
        latency = round((time.perf_counter() - start) * 1000)
        status = "down"
        error_msg = str(e)

    res = {
        "target": url,
        "name": monitor["name"],
        "status": status,
        "latency": latency,
        "statusCode": status_code,
        "error": error_msg,
        "category": monitor.get("category", "web"),
        "type": "http",
    }
    if "id" in monitor:
        res["monitorId"] = monitor["id"]
    return res

def check_tcp(monitor):
    raw_host = monitor["target"]
    host = raw_host.replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]
    port = int(monitor.get("port", 80))
    timeout = int(monitor.get("timeout", 3))

    start = time.perf_counter()
    status = "down"
    error_msg = None

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        latency = round((time.perf_counter() - start) * 1000)
        status = "degraded" if latency > 2000 else "operational"
        sock.close()
    except Exception as e:
        latency = round((time.perf_counter() - start) * 1000)
        status = "down"
        error_msg = f"TCP connect error port {port}: {e}"
        sock.close()

    res = {
        "target": host,
        "port": port,
        "name": monitor["name"],
        "status": status,
        "latency": latency,
        "error": error_msg,
        "category": monitor.get("category", "server"),
        "type": "tcp",
    }
    if "id" in monitor:
        res["monitorId"] = monitor["id"]
    return res

def send_batch_report(dashboard_url, secret_key, reports):
    if not reports:
        return True, "No reports"
    endpoint = f"{dashboard_url.rstrip('/')}/api/agent/report"
    payload = {
        "reports": reports,
        "secretKey": secret_key,
    }
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-agent-secret": secret_key,
            "User-Agent": "KWSG-Intranet-Agent-Python/2.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            resp_body = res.read().decode("utf-8")
            return True, resp_body
    except Exception as e:
        return False, str(e)

def run_cycle(dashboard_url, secret_key, disable_sync=False):
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    print(f"\n[{timestamp}] --- Memulai Pemeriksaan Server 172.20.110.20 & Intranet ---")

    active_monitors = []
    if not disable_sync:
        cloud = fetch_cloud_targets(dashboard_url)
        active_monitors.extend(cloud)

    # Tambahkan target lokal jika belum ada di cloud list
    existing_targets = {m.get("target", "").lower().rstrip("/") for m in active_monitors}
    for lm in LOCAL_MONITORS:
        if lm["target"].lower().rstrip("/") not in existing_targets:
            active_monitors.append(lm)

    # Cek targets.json lokal jika ada
    json_path = os.path.join(os.path.dirname(__file__), "targets.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                extra = json.load(f)
                if isinstance(extra, list):
                    for em in extra:
                        if em.get("target", "").lower().rstrip("/") not in existing_targets:
                            active_monitors.append(em)
                    print(f"[File] Memuat target tambahan dari targets.json ({len(extra)} item)")
        except Exception as e:
            print(f"[Warn] Gagal membaca targets.json: {e}")

    print(f"Total target yang diperiksa: {len(active_monitors)} endpoint")
    reports = []

    for m in active_monitors:
        name = m.get("name", "Unknown")
        target = m.get("target", "")
        m_type = m.get("type", "http")

        if m_type in ("tcp", "database"):
            res = check_tcp(m)
        else:
            res = check_http(m)

        code_info = f"HTTP {res.get('statusCode')}" if res.get('statusCode') else f"Port {res.get('port')}" if res.get('port') else ""
        err_info = f" [{res['error']}]" if res.get('error') else ""
        print(f" -> {name} ({target}): {res['status'].upper()} ({res['latency']}ms) {code_info}{err_info}")
        reports.append(res)

    ok, msg = send_batch_report(dashboard_url, secret_key, reports)
    if ok:
        print(f"[SUKSES] {len(reports)} laporan target berhasil dikirim ke dashboard cloud ({dashboard_url})")
    else:
        print(f"[GAGAL] Gagal mengirim ke dashboard: {msg}")

def main():
    parser = argparse.ArgumentParser(description="Semen Indonesia Cooperative - Multi-Service Intranet Agent")
    parser.add_argument("--url", default=DEFAULT_DASHBOARD_URL, help="Dashboard URL")
    parser.add_argument("--secret", default=DEFAULT_SECRET_KEY, help="Agent Secret Key")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SEC, help="Interval in seconds (default: 1800 / 30 mins)")
    parser.add_argument("--daemon", action="store_true", help="Run continuously as background daemon")
    parser.add_argument("--no-sync", action="store_true", help="Disable cloud auto-sync, only use local target list")
    args = parser.parse_args()

    print("=" * 65)
    print(" SEMEN INDONESIA COOPERATIVE - MULTI-SERVICE INTRANET AGENT (PYTHON)")
    print(f" Target Dashboard : {args.url}")
    print(f" Polling Interval : {args.interval}s (30 Menit)")
    print("=" * 65)

    if not args.daemon:
        run_cycle(args.url, args.secret, disable_sync=args.no_sync)
        print("\nMode sekali jalan selesai. Gunakan flag --daemon untuk pemantauan terus-menerus.")
    else:
        print("\nMode daemon aktif. Tekan Ctrl+C untuk berhenti.\n")
        try:
            while True:
                run_cycle(args.url, args.secret, disable_sync=args.no_sync)
                print(f"Menunggu {args.interval} detik (30 menit) untuk siklus berikutnya...")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nAgent dihentikan oleh pengguna.")

if __name__ == "__main__":
    main()
