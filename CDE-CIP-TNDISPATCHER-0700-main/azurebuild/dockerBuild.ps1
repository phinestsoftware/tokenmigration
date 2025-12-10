param
(
    [parameter(Mandatory)]$jfrogUserName,
    [parameter(Mandatory)] $jfrogPassword,
    [string] $dockerRegistrykey
)

$global:PSScriptEntry = $PSScriptRoot

$buildRepoName="$env:BUILD_REPOSITORY_NAME".Replace("RogersCommunications/","");
Switch ($buildRepoName)
{
    'CDE-XXX' { $serviceName = "CDE-XXX"; break }
    'CDE-XXX' { $serviceName = "CDE-XXX"; break }
    default { $serviceName = $buildRepoName.ToLower() }
}
$jfrogMirrorRepo= "$env:JFROG_MIRROR_REPO"
$imagePrefix="$env:IMAGE_PREFIX";
# $dockerRegistrykey="$env:DOCKER_REGISTRY_AUTHKEY"  
$buildNumber =$env:BUILD_BUILDNUMBER

$RootPath = Split-Path $PSScriptRoot -Parent
Set-Location $RootPath
Write-Host "Create Docker build Started"
Write-Output "$jfrogPassword" | docker login $jfrogMirrorRepo --username $jfrogUserName --password-stdin
$tagname = "$imagePrefix/aks-${serviceName}:$buildNumber"
Write-Output $tagname
if($serviceName.Equals("CCE-client-ui"))
{
    Write-Output "building CCE-client-ui build"
    docker build -t $tagname --build-arg DOCKER_REGISTRY_AUTHKEY=$dockerRegistrykey .
}
else
{
    Write-Output "building $serviceName java micro serive build"
    docker build -t $tagname .
}
docker logout $jfrogMirrorRepo
Set-Location $PSScriptRoot
Write-Host "Docker build created succesfully"
