#!/usr/bin/env python3
"""
Semen Indonesia Cooperative - Intranet Monitoring Agent (Python 3)
Zero-dependency Python agent for monitoring internal intranet applications
(like http://172.20.110.20/hrdonline) and posting health heartbeats to Vercel/Cloud.
"""

import sys
import time
import json
import ssl
import argparse
import urllib.request
import urllib.error

# DEFAULT CONFIGURATION
DEFAULT_DASHBOARD_URL = "https://dashboard-server.vercel.app"
DEFAULT_SECRET_KEY = "kwsg-intranet-agent-key-2026"
DEFAULT_INTERVAL_SEC = 1800  # 30 Menit

MONITORS = [
    {
        "name": "HRD Online Intranet",
        "target": "http://172.20.110.20/hrdonline",
        "category": "web",
        "type": "http",
        "timeout": 5
    }
]

def check_target(monitor):
    url = monitor["target"]
    timeout = monitor.get("timeout", 5)
    
    # Allow self-signed SSL for internal intranet
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "KWSG-Intranet-Agent-Python/1.0", "Accept": "*/*"}
    )

    start = time.perf_counter()
    status = "down"
    status_code = None
    error_msg = None

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            latency = round((time.perf_counter() - start) * 1000)
            status_code = response.getcode()
            if 200 <= status_code < 400:
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

    return {
        "target": url,
        "name": monitor["name"],
        "status": status,
        "latency": latency,
        "statusCode": status_code,
        "error": error_msg,
        "category": monitor.get("category", "web"),
        "type": monitor.get("type", "http"),
    }

def send_report(dashboard_url, secret_key, report):
    endpoint = f"{dashboard_url.rstrip('/')}/api/agent/report"
    data = json.dumps(report).encode("utf-8")
    
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-agent-secret": secret_key,
            "User-Agent": "KWSG-Intranet-Agent/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            resp_body = res.read().decode("utf-8")
            return True, resp_body
    except Exception as e:
        return False, str(e)

def run_cycle(dashboard_url, secret_key):
    print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Memulai pengecekan intranet ({len(MONITORS)} target)...")
    for m in MONITORS:
        print(f" -> Memeriksa {m['name']} ({m['target']})...")
        res = check_target(m)
        print(f"    Status: {res['status'].upper()} | Latency: {res['latency']}ms | HTTP: {res['statusCode']} | Error: {res['error']}")
        
        ok, msg = send_report(dashboard_url, secret_key, res)
        if ok:
            print(f"    [OK] Laporan berhasil dikirim ke dashboard ({dashboard_url})")
        else:
            print(f"    [FAIL] Gagal mengirim ke dashboard: {msg}")

def main():
    parser = argparse.ArgumentParser(description="Semen Indonesia Cooperative - Intranet Agent")
    parser.add_argument("--url", default=DEFAULT_DASHBOARD_URL, help="Dashboard URL")
    parser.add_argument("--secret", default=DEFAULT_SECRET_KEY, help="Agent Secret Key")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SEC, help="Interval in seconds (default: 1800)")
    parser.add_argument("--daemon", action="store_true", help="Run continuously as background daemon")
    args = parser.parse_args()

    print("=" * 60)
    print(" SEMEN INDONESIA COOPERATIVE - INTRANET MONITOR AGENT (PYTHON)")
    print(f" Target Dashboard : {args.url}")
    print(f" Polling Interval : {args.interval}s (30 Menit)")
    print("=" * 60)

    if not args.daemon:
        run_cycle(args.url, args.secret)
        print("\nSelesai (mode sekali jalan). Gunakan flag --daemon untuk menjalankan berkala terus menerus.")
    else:
        print("\nMode daemon aktif. Tekan Ctrl+C untuk menghentikan.\n")
        try:
            while True:
                run_cycle(args.url, args.secret)
                print(f"Menunggu {args.interval} detik untuk siklus berikutnya...")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nAgent dihentikan oleh pengguna.")

if __name__ == "__main__":
    main()
