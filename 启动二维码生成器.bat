@echo off
chcp 65001 >nul

:: 设置工作目录为当前批处理文件所在目录
cd /d "%~dp0"

:: 显示欢迎信息
cls
echo.
echo =======================================================
echo                简易二维码生成器 - 启动脚本
echo =======================================================
echo.
echo 本脚本将启动本地服务器，让您可以使用二维码生成器
 echo.
echo 请选择您要启动的功能：
echo 1. 启动简易二维码生成器
 echo 2. 打开简化版线上部署方案文档
echo.

:: 获取用户选择
set /p choice="请输入选择 (1 或 2): "

:: 根据用户选择执行相应操作
if "%choice%" == "1" (
    goto start_qrcode
) else if "%choice%" == "2" (
    goto open_document
) else (
    echo 无效的选择，将默认启动二维码生成器...
    goto start_qrcode
)

:: 启动二维码生成器
:start_qrcode
echo.
echo 正在启动简易二维码生成器...
echo.

:: 尝试使用不同的方式启动本地服务器

:: 方法1: 使用PowerShell的HTTP服务器
powershell -Command "
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:' + $port + '/')
try {
    $listener.Start()
    Write-Host '本地服务器已启动，正在打开简易二维码生成器...' -ForegroundColor Green
    Write-Host '访问地址: http://localhost:'$port'/简易二维码生成器.html' -ForegroundColor Green
    Write-Host ''
    Write-Host '使用说明:' -ForegroundColor Yellow
    Write-Host '1. 在上方输入框中粘贴您的预约系统网址'
    Write-Host '2. 选择合适的二维码大小'
    Write-Host '3. 点击"生成二维码"按钮'
    Write-Host '4. 生成成功后，点击"下载二维码"按钮保存图片'
    Write-Host ''
    Write-Host '按任意键停止服务器...' -ForegroundColor Yellow
    
    # 打开浏览器访问二维码生成器
    Start-Process 'http://localhost:'$port'/简易二维码生成器.html'
    
    while ($listener.IsListening) {
        $context = $listener.GetContextAsync().Result
        $request = $context.Request
        $response = $context.Response
        
        try {
            $localPath = $request.Url.LocalPath
            $filePath = [System.IO.Path]::Combine($PSScriptRoot, $localPath.Substring(1))
            
            if ([System.IO.File]::Exists($filePath)) {
                $contentType = 'text/html'
                if ($filePath -match '\.css$') { $contentType = 'text/css' }
                if ($filePath -match '\.js$') { $contentType = 'application/javascript' }
                if ($filePath -match '\.png$') { $contentType = 'image/png' }
                if ($filePath -match '\.jpg$') { $contentType = 'image/jpeg' }
                if ($filePath -match '\.gif$') { $contentType = 'image/gif' }
                
                $buffer = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $buffer.Length
                $response.ContentType = $contentType
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } else {
                $response.StatusCode = 404
                $buffer = [System.Text.Encoding]::UTF8.GetBytes('<html><body><h1>404 未找到文件</h1></body></html>')
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
        } catch {
            $response.StatusCode = 500
            $buffer = [System.Text.Encoding]::UTF8.GetBytes('<html><body><h1>500 服务器错误</h1><p>' + $_.Exception.Message + '</p></body></html>')
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } finally {
            $response.OutputStream.Close()
        }
    }
} catch {
    Write-Host '启动服务器失败，请尝试其他方法。' -ForegroundColor Red
    Write-Host '错误信息: ' $_.Exception.Message -ForegroundColor Red
    Write-Host '按任意键退出...'
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
" 

goto end

:: 打开部署方案文档
:open_document
echo.
echo 正在打开简化版线上部署方案文档...
echo.
start "" "简化版线上部署方案.md"
echo.
echo 文档已打开，请按照文档中的步骤进行操作。
echo.
echo 按任意键退出...
pause >nul
goto end

:end