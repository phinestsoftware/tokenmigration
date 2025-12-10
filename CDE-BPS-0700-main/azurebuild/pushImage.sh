if [ "$#" -eq  "0" ]
then
    echo "No arguments supplied"
    exit 1

else
    echo " **** Second part of script - Input Parameters **** "
    echo "jFrogUName ::: " $1 
    echo "jFrogUNamePws ::: " $2
    echo "repo ::: " $3 
    echo "build # ::: " $4
    echo "dir ::: " $5
    echo "Repo Name ::: " $6
    echo " **** Second part of script - Input Parameters **** "
    curl -sSf -u "$1:$2" -X PUT -T $5/bps-service-0.0.1-SNAPSHOT.jar 'https://artifactory.rogers.com:443/artifactory/'$3'/'$6'/'$4'/bps-service-0.0.1-SNAPSHOT.jar'
    #echo 'Listing local images before delete'
    
    #echo 'Listing local images after delete'
    #docker images -a
fi
