<#
.SYNOPSIS
    Semen Indonesia Cooperative - Intranet Monitoring Agent (PowerShell)
    Memantau BANYAK aplikasi/layanan di server intranet 172.20.110.20
    dan mengirimkan laporan status berkala secara otomatis ke Dashboard Cloud Vercel.

.DESCRIPTION
    Fitur Unggulan:
    1. Multi-Target Server: Memantau banyak endpoint di 172.20.110.20 (/hrdonline, /sipk, /absensi, MySQL 3306, dll)
    2. Auto-Sync Cloud: Otomatis mengunduh daftar target dari Dashboard Cloud (Tambah target di web langsung terpantau!)
    3. Batch Reporting: Mengirim semua hasil pemeriksaan dalam 1 panggilan API efisien
    4. Mendukung protokol HTTP/HTTPS dan TCP Socket (Port database/SSH/Web)
    5. Mode Sekali Eksekusi (-RunOnce untuk Windows Task Scheduler) atau Daemon (-Daemon)

.EXAMPLE
    .\agent-intranet.ps1 -DashboardUrl "https://your-dashboard.vercel.app" -RunOnce
    .\agent-intranet.ps1 -Daemon -IntervalSeconds 1800
#>

param(
    [string]$DashboardUrl = "https://dashboard-server.vercel.app",
    [string]$SecretKey = "kwsg-intranet-agent-key-2026",
    [int]$IntervalSeconds = 1800, # 30 menit (Default Corporate)
    [switch]$Daemon,
    [switch]$RunOnce,
    [switch]$DisableAutoSync # Hanya gunakan daftar lokal jika parameter ini disetel
)

# ==============================================================================
# DAFTAR TARGET LOKAL SERVER 172.20.110.20 & INTRANET LAINNYA
# Tambahkan atau ubah endpoint aplikasi di server 20 pada array di bawah:
# ==============================================================================
$LocalMonitors = @(
    @{
        Name     = "HRD Online (Server 20)"
        Target   = "http://172.20.110.20/hrdonline"
        Category = "web"
        Type     = "http"
        Timeout  = 5
    },
    @{
        Name     = "Portal Aplikasi Intranet (Server 20)"
        Target   = "http://172.20.110.20"
        Category = "web"
        Type     = "http"
        Timeout  = 5
    }
    # Contoh menambahkan aplikasi lain di server 20:
    # ,@{
    #     Name     = "Sistem Informasi Kepegawaian (Server 20)"
    #     Target   = "http://172.20.110.20/sipk"
    #     Category = "web"
    #     Type     = "http"
    #     Timeout  = 5
    # },
    # ,@{
    #     Name     = "Presensi & Absensi Karyawan (Server 20)"
    #     Target   = "http://172.20.110.20/absensi"
    #     Category = "web"
    #     Type     = "http"
    #     Timeout  = 5
    # },
    # ,@{
    #     Name     = "Database MySQL Server 20 (Port 3306)"
    #     Target   = "172.20.110.20"
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

function Fetch-CloudTargets {
    param([string]$BaseUrl)
    $endpoint = "$($BaseUrl.TrimEnd('/'))/api/agent/report"
    try {
        $res = Invoke-RestMethod -Uri $endpoint -Method Get -TimeoutSec 10
        if ($res.targets -and $res.targets.Count -gt 0) {
            Write-Log "Auto-Sync: Ditemukan $($res.targets.Count) target intranet dari Dashboard Cloud" "Cyan"
            return $res.targets
        }
    } catch {
        Write-Log "Auto-Sync: Menggunakan daftar target lokal (Cloud sync offline atau belum ada)" "DarkGray"
    }
    return @()
}

function Test-HttpTarget {
    param($Item)
    $url = $Item.target
    if (-not $url) { $url = $Item.Target }
    if (-not ($url.StartsWith("http://") -or $url.StartsWith("https://"))) {
        $url = "http://$url"
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = "down"
    $statusCode = $null
    $errorMsg = $null
    $timeoutSec = if ($Item.timeout) { [int]$Item.timeout } elseif ($Item.Timeout) { [int]$Item.Timeout } else { 5 }

    try {
        # Bypass self-signed SSL check jika intranet memakai HTTPS lokal
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Timeout = ($timeoutSec * 1000)
        $request.UserAgent = "KWSG-Intranet-Agent/2.0"
        $request.Method = if ($Item.method) { $Item.method } else { "GET" }
        
        $response = $request.GetResponse()
        $sw.Stop()
        $httpResponse = [System.Net.HttpWebResponse]$response
        $statusCode = [int]$httpResponse.StatusCode
        
        $expected = if ($Item.expectedStatusCode) { [int]$Item.expectedStatusCode } else { 200 }
        if ($statusCode -eq $expected -or ($statusCode -ge 200 -and $statusCode -lt 400)) {
            $status = if ($sw.ElapsedMilliseconds -gt 2500) { "degraded" } else { "operational" }
        } else {
            $status = "down"
            $errorMsg = "HTTP Status Code tidak sesuai: $statusCode (harapan $expected)"
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

    $name = if ($Item.name) { $Item.name } else { $Item.Name }
    return @{
        target     = $url
        name       = $name
        status     = $status
        latency    = [math]::Round($sw.ElapsedMilliseconds)
        statusCode = $statusCode
        error      = $errorMsg
        category   = if ($Item.category) { $Item.category } else { "web" }
        type       = "http"
    }
}

function Test-TcpTarget {
    param($Item)
    $hostTarget = if ($Item.target) { $Item.target } else { $Item.Target }
    # Bersihkan protokol jika ada
    $hostClean = $hostTarget.Replace("http://", "").Replace("https://", "").Split("/")[0].Split(":")[0]
    $port = if ($Item.port) { [int]$Item.port } elseif ($Item.Port) { [int]$Item.Port } else { 80 }
    $timeoutSec = if ($Item.timeout) { [int]$Item.timeout } elseif ($Item.Timeout) { [int]$Item.Timeout } else { 3 }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = "down"
    $errorMsg = $null

    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectTask = $tcpClient.ConnectAsync($hostClean, $port)
        $waitOk = $connectTask.Wait($timeoutSec * 1000)

        $sw.Stop()
        if ($waitOk -and $tcpClient.Connected) {
            $status = if ($sw.ElapsedMilliseconds -gt 2000) { "degraded" } else { "operational" }
            $tcpClient.Close()
        } else {
            $status = "down"
            $errorMsg = "Koneksi TCP Port $port Timeout ($($timeoutSec)s)"
            if ($tcpClient.Connected) { $tcpClient.Close() }
        }
    } catch {
        $sw.Stop()
        $status = "down"
        $errorMsg = $_.Exception.Message
    }

    $name = if ($Item.name) { $Item.name } else { $Item.Name }
    return @{
        target     = $hostClean
        port       = $port
        name       = $name
        status     = $status
        latency    = [math]::Round($sw.ElapsedMilliseconds)
        error      = $errorMsg
        category   = if ($Item.category) { $Item.category } else { "server" }
        type       = "tcp"
    }
}

function Send-BatchReports {
    param([array]$Reports)
    if ($Reports.Count -eq 0) { return }

    $reportEndpoint = "$($DashboardUrl.TrimEnd('/'))/api/agent/report"
    $payload = @{
        reports   = $Reports
        secretKey = $SecretKey
    }
    $bodyJson = $payload | ConvertTo-Json -Depth 4 -Compress

    try {
        $headers = @{
            "Content-Type"   = "application/json"
            "x-agent-secret" = $SecretKey
        }
        
        $res = Invoke-RestMethod -Uri $reportEndpoint -Method Post -Body $bodyJson -Headers $headers -TimeoutSec 20
        if ($res.success) {
            Write-Log "  -> [SUKSES] $($Reports.Count) laporan target berhasil disinkronkan ke Dashboard Cloud!" "Green"
        } else {
            Write-Log "  -> [GAGAL] Server menolak laporan: $($res.error)" "Yellow"
        }
    } catch {
        Write-Log "  -> [ERROR] Gagal menghubungi Dashboard ($reportEndpoint): $($_.Exception.Message)" "Red"
    }
}

function Run-AgentCycle {
    Write-Log "===============================================================" "Blue"
    Write-Log "Memulai Siklus Pemantauan Server 172.20.110.20 & Intranet" "White"
    Write-Log "===============================================================" "Blue"

    # 1. Kumpulkan daftar target (Auto-Sync Cloud + Local fallback)
    $activeMonitors = @()
    if (-not $DisableAutoSync) {
        $cloudMonitors = Fetch-CloudTargets -BaseUrl $DashboardUrl
        foreach ($cm in $cloudMonitors) {
            $activeMonitors += $cm
        }
    }

    # Tambahkan monitor lokal jika belum ada di daftar cloud
    foreach ($lm in $LocalMonitors) {
        $lmTarget = if ($lm.Target) { $lm.Target.ToLower().TrimEnd('/') } else { "" }
        $alreadyInCloud = $activeMonitors | Where-Object { 
            $t = if ($_.target) { $_.target.ToLower().TrimEnd('/') } else { "" }
            $t -eq $lmTarget 
        }
        if (-not $alreadyInCloud) {
            $activeMonitors += $lm
        }
    }

    # Muat dari file targets.json jika tersedia
    $targetsJsonPath = Join-Path $PSScriptRoot "targets.json"
    if (Test-Path $targetsJsonPath) {
        try {
            $fileContent = Get-Content $targetsJsonPath -Raw | ConvertFrom-Json
            if ($fileContent -and $fileContent.Count -gt 0) {
                Write-Log "Memuat target tambahan dari targets.json ($($fileContent.Count) target)" "Cyan"
                foreach ($fm in $fileContent) {
                    $activeMonitors += $fm
                }
            }
        } catch {
            Write-Log "Gagal membaca targets.json: $($_.Exception.Message)" "Yellow"
        }
    }

    Write-Log "Total target yang akan diperiksa: $($activeMonitors.Count) endpoint" "White"
    $collectedReports = @()

    # 2. Eksekusi pemeriksaan untuk setiap target di server 20
    foreach ($m in $activeMonitors) {
        $targetName = if ($m.name) { $m.name } else { $m.Name }
        $targetUrl = if ($m.target) { $m.target } else { $m.Target }
        $targetType = if ($m.type) { $m.type } else { $m.Type }

        Write-Host ""
        Write-Log ">> Memeriksa: $targetName ($targetUrl)" "Gray"
        
        $checkResult = if ($targetType -eq "tcp" -or $targetType -eq "database") {
            Test-TcpTarget -Item $m
        } else {
            Test-HttpTarget -Item $m
        }

        # Simpan monitorId jika ada dari cloud sync
        if ($m.id) { $checkResult["monitorId"] = $m.id }

        $color = switch ($checkResult.status) {
            "operational" { "Green" }
            "degraded"    { "Yellow" }
            default       { "Red" }
        }

        $detailStr = if ($checkResult.statusCode) { "HTTP $($checkResult.statusCode)" } elseif ($checkResult.port) { "Port $($checkResult.port)" } else { "" }
        if ($checkResult.error) { $detailStr += " [$($checkResult.error)]" }

        Write-Log "   Status: $($checkResult.status.ToUpper()) | Latency: $($checkResult.latency)ms | $detailStr" $color
        $collectedReports += $checkResult
    }

    # 3. Kirim semua hasil sekaligus dalam 1 batch payload
    Write-Host ""
    Write-Log "Mengirim $($collectedReports.Count) hasil pemeriksaan ke Dashboard..." "Cyan"
    Send-BatchReports -Reports $collectedReports
    Write-Log "Siklus pemeriksaan selesai pada $(Get-Date -Format 'HH:mm:ss')" "Green"
}

# --- MAIN CONTROLLER ---
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " SEMEN INDONESIA COOPERATIVE - MULTI-SERVICE INTRANET AGENT" -ForegroundColor White
Write-Host " Target Dashboard : $DashboardUrl" -ForegroundColor Gray
Write-Host " Siklus Polling   : $IntervalSeconds detik (30 Menit)" -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Cyan

if ($RunOnce -or (-not $Daemon)) {
    Run-AgentCycle
    if (-not $RunOnce) {
        Write-Host ""
        Write-Log "Mode sekali jalan selesai. Jalankan dengan parameter -Daemon untuk pemantauan terus-menerus:" "Yellow"
        Write-Log "powershell -ExecutionPolicy Bypass -File .\agent-intranet.ps1 -Daemon" "White"
    }
} else {
    Write-Log "Mode Daemon Aktif. Pengecekan otomatis berjalan tiap $IntervalSeconds detik. Tekan Ctrl+C untuk keluar." "Green"
    while ($true) {
        Run-AgentCycle
        Write-Log "Menunggu $IntervalSeconds detik (30 menit) untuk siklus pemeriksaan berikutnya..." "DarkGray"
        Start-Sleep -Seconds $IntervalSeconds
    }
}
