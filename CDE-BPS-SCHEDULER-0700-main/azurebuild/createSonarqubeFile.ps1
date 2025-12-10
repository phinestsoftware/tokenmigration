$global:PSScriptEntry = $PSScriptRoot
Write-Host "Create Deployment Configuration"

$buildRepoName="$env:BUILD_REPOSITORY_NAME".Replace("RogersCommunications/","");
Switch ($buildRepoName)
{
    'CCE-XXX' { $repoName = "CCE-XXX"; break }
    'CCE-XXX' { $repoName = "CCE-XXX"; break }
    default { $repoName = $buildRepoName.ToLower() }
}


$githubBranch = "$env:BUILD_SOURCEBRANCHNAME"
$sonarPath = [System.IO.Path]::Combine("$PSScriptRoot/Templates/sonar-project.properties")
$sonarFile = Get-Content -Path $sonarPath| Out-String
$sonarFile = $sonarFile -Replace ".APPLICATION_NAME.","$repoName"
$sonarFile = $sonarFile -Replace ".BRANCH_NAME.","$githubBranch"
$RootPath = Split-Path $PSScriptRoot -Parent
Write-Host($RootPath)
$sonarFile | Out-File -FilePath "$RootPath\sonar-project.properties"
Write-Host $sonarFile
Write-Host "Deployment Configuration Completed"



 
