<#
.SYNOPSIS
    Semen Indonesia Cooperative - Intranet Monitoring Agent (PowerShell)
    Memantau server/aplikasi di intranet (seperti http://172.20.110.20/hrdonline)
    dan mengirim laporan status secara berkala ke Dashboard Monitoring Vercel/Cloud.

.DESCRIPTION
    Script ini dapat dijalankan:
    1. Sekali eksekusi via Windows Task Scheduler (Tiap 30 Menit)
    2. Sebagai Daemon background service (Parameter -Daemon)

.EXAMPLE
    .\agent-intranet.ps1 -DashboardUrl "https://your-dashboard.vercel.app" -RunOnce
    .\agent-intranet.ps1 -Daemon -IntervalSeconds 1800
#>

param(
    [string]$DashboardUrl = "https://dashboard-server.vercel.app",
    [string]$SecretKey = "kwsg-intranet-agent-key-2026",
    [int]$IntervalSeconds = 1800, # 30 menit
    [switch]$Daemon,
    [switch]$RunOnce
)

# DAFTAR TARGET INTRANET YANG INGIN DIPANTAU
$Monitors = @(
    @{
        Name     = "HRD Online Intranet"
        Target   = "http://172.20.110.20/hrdonline"
        Category = "web"
        Type     = "http"
        Timeout  = 5
    }
    # Tambahkan target intranet lain di bawah ini jika diperlukan:
    # ,@{
    #     Name     = "Database MySQL Intranet"
    #     Target   = "172.20.110.25"
    #     Port     = 3306
    #     Category = "database"
    #     Type     = "tcp"
    #     Timeout  = 3
    # }
)

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Test-HttpTarget {
    param($Item)
    $url = $Item.Target
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = "down"
    $statusCode = $null
    $errorMsg = $null

    try {
        # Bypass self-signed SSL check jika intranet memakai HTTPS internal
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Timeout = ($Item.Timeout * 1000)
        $request.UserAgent = "KWSG-Intranet-Agent/1.0"
        $request.Method = "GET"
        
        $response = $request.GetResponse()
        $sw.Stop()
        $httpResponse = [System.Net.HttpWebResponse]$response
        $statusCode = [int]$httpResponse.StatusCode
        
        if ($statusCode -ge 200 -and $statusCode -lt 400) {
            $status = if ($sw.ElapsedMilliseconds -gt 2500) { "degraded" } else { "operational" }
        } else {
            $status = "down"
            $errorMsg = "HTTP Status Code: $statusCode"
        }
        $response.Close()
    }
    catch [System.Net.WebException] {
        $sw.Stop()
        $ex = $_.Exception
        if ($ex.Response) {
            $statusCode = [int][System.Net.HttpWebResponse]$ex.Response.StatusCode
            $status = if ($statusCode -ge 500) { "down" } else { "degraded" }
            $errorMsg = "HTTP Error $statusCode: " + $ex.Message
        } else {
            $status = "down"
            $errorMsg = $ex.Message
        }
    }
    catch {
        $sw.Stop()
        $status = "down"
        $errorMsg = $_.Exception.Message
    }

    return @{
        Target     = $url
        Name       = $Item.Name
        Status     = $status
        Latency    = [math]::Round($sw.ElapsedMilliseconds)
        StatusCode = $statusCode
        Error      = $errorMsg
        Category   = $Item.Category
        Type       = $Item.Type
    }
}

function Send-ReportToDashboard {
    param($Report)
    $reportEndpoint = "$($DashboardUrl.TrimEnd('/'))/api/agent/report"
    $bodyJson = $Report | ConvertTo-Json -Compress

    try {
        $headers = @{
            "Content-Type"   = "application/json"
            "x-agent-secret" = $SecretKey
        }
        
        $res = Invoke-RestMethod -Uri $reportEndpoint -Method Post -Body $bodyJson -Headers $headers -TimeoutSec 15
        if ($res.success) {
            Write-Log "  -> Berhasil dikirim ke Dashboard Cloud ($reportEndpoint)" "Green"
        } else {
            Write-Log "  -> Gagal dikirim: $($res.error)" "Yellow"
        }
    } catch {
        Write-Log "  -> Gagal menghubungi dashboard cloud ($reportEndpoint): $($_.Exception.Message)" "Red"
    }
}

function Run-AgentCycle {
    Write-Log "--- Memulai Pengecekan Intranet Target ($($Monitors.Count) server) ---" "Cyan"
    
    foreach ($m in $Monitors) {
        Write-Log "Memeriksa $($m.Name) ($($m.Target))..." "Gray"
        $check = Test-HttpTarget -Item $m
        
        $color = switch ($check.Status) {
            "operational" { "Green" }
            "degraded"    { "Yellow" }
            default       { "Red" }
        }
        
        Write-Log "Status: $($check.Status.ToUpper()) | Waktu Respon: $($check.Latency)ms | HTTP: $($check.StatusCode) $($check.Error)" $color
        Send-ReportToDashboard -Report $check
    }
    
    Write-Log "--- Siklus pengecekan selesai ---" "Cyan"
}

# --- MAIN EXECUTION ---
Write-Host "===============================================================" -ForegroundColor Blue
Write-Host " SEMEN INDONESIA COOPERATIVE - INTRANET MONITOR AGENT" -ForegroundColor White
Write-Host " Target Dashboard: $DashboardUrl" -ForegroundColor Gray
Write-Host " Interval: $IntervalSeconds detik (Default 30 Menit)" -ForegroundColor Gray
Write-Host "===============================================================" -ForegroundColor Blue

if ($RunOnce -or (-not $Daemon)) {
    Run-AgentCycle
    if (-not $RunOnce) {
        Write-Log "Mode sekali jalan selesai. Jalankan dengan parameter -Daemon untuk pemantauan terus-menerus." "Yellow"
    }
} else {
    Write-Log "Mode Daemon Aktif. Pengecekan otomatis berjalan tiap $IntervalSeconds detik. Tekan Ctrl+C untuk berhenti." "Green"
    while ($true) {
        Run-AgentCycle
        Write-Log "Menunggu $IntervalSeconds detik untuk pengecekan berikutnya..." "DarkGray"
        Start-Sleep -Seconds $IntervalSeconds
    }
}
