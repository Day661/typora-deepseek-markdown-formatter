[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$KeepTag,

  [string]$Repo = "Day661/typora-deepseek-markdown-formatter"
)

$ErrorActionPreference = "Stop"

function Assert-LastExitCode([string]$Operation) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Operation 失败，退出码：$LASTEXITCODE"
  }
}

# 先确认新版 Release 已经公开，避免发布失败时误删所有旧版本。
gh release view $KeepTag --repo $Repo --json tagName,isDraft,isPrerelease | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "保留版本不存在或无法读取：$KeepTag"
}

$releaseJson = gh release list --repo $Repo --limit 100 --json tagName
Assert-LastExitCode "读取 Release 列表"
$releases = @($releaseJson | ConvertFrom-Json)

foreach ($release in $releases) {
  if ($release.tagName -eq $KeepTag) { continue }
  if ($PSCmdlet.ShouldProcess("$Repo $($release.tagName)", "删除旧 Release 及标签")) {
    gh release delete $release.tagName --repo $Repo --cleanup-tag --yes
    Assert-LastExitCode "删除旧 Release $($release.tagName)"
  }
}

# 清理没有对应 Release 的遗留远程标签。
$remoteTagLines = @(git ls-remote --tags origin)
Assert-LastExitCode "读取远程标签"
$remoteTags = @(
  $remoteTagLines |
    ForEach-Object { ($_ -split "refs/tags/", 2)[1] } |
    Where-Object { $_ -and -not $_.EndsWith("^{}") } |
    Sort-Object -Unique
)
foreach ($tag in $remoteTags) {
  if ($tag -eq $KeepTag) { continue }
  if ($PSCmdlet.ShouldProcess("origin $tag", "删除旧远程标签")) {
    git push origin --delete $tag
    Assert-LastExitCode "删除旧远程标签 $tag"
  }
}

if (-not $WhatIfPreference) {
  $remainingJson = gh release list --repo $Repo --limit 100 --json tagName
  Assert-LastExitCode "复核 Release 列表"
  $remaining = @($remainingJson | ConvertFrom-Json)
  if ($remaining.Count -ne 1 -or $remaining[0].tagName -ne $KeepTag) {
    throw "清理后公开 Release 数量不是 1，或保留版本不是 $KeepTag"
  }

  $remainingTagLines = @(git ls-remote --tags origin)
  Assert-LastExitCode "复核远程标签"
  $remainingTags = @(
    $remainingTagLines |
      ForEach-Object { ($_ -split "refs/tags/", 2)[1] } |
      Where-Object { $_ -and -not $_.EndsWith("^{}") } |
      Sort-Object -Unique
  )
  if ($remainingTags.Count -ne 1 -or $remainingTags[0] -ne $KeepTag) {
    throw "清理后远程标签数量不是 1，或保留标签不是 $KeepTag"
  }
}

Write-Host "已只保留最新版本：$KeepTag"
