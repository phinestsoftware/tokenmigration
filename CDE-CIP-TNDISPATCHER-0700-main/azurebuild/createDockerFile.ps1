$global:PSScriptEntry = $PSScriptRoot
Write-Host "Create Deployment Configuration"

$buildRepoName="$env:BUILD_REPOSITORY_NAME".Replace("RogersCommunications/","");
Switch ($buildRepoName)
{
    'CDE-XXX' { $repoName = "CDE-XXX"; break }
    'CDE-XXX' { $repoName = "CDE-XXX"; break }
    default { $repoName = $buildRepoName.ToLower() }
}

$jfrogMirrorRepo= "$env:JFROG_MIRROR_REPO"

Write-Host($PSScriptRoot)
$path = [System.IO.Path]::Combine("$PSScriptRoot/Templates/javaDockerfile")
$dockerFile = Get-Content -Path $path | Out-String
$dockerFile = $dockerFile -Replace ".JFROG_MIRROR_REPO.","$jfrogMirrorRepo"
$dockerFile = $dockerFile -Replace ".JAR_NAME.","$repoName"
$RootPath = Split-Path $PSScriptRoot -Parent
Write-Host($RootPath)
$dockerFile | Out-File -FilePath "$RootPath/Dockerfile"
Write-Host $dockerFile
Write-Host "Deployment Configuration Completed"
