if [ "$#" -eq  "0" ]
then
    echo "No arguments supplied"
    exit 1
else
    echo 'Listing local images before delete'
    docker images -a
    IMAGENAME="$1"
    echo "Search Label:$IMAGENAME"
    IMAGEIDS=$(docker images -a | grep "$IMAGENAME" | awk '{print $3}')
    echo "Matched Images: $IMAGEIDS"
    if [ -z "$IMAGEIDS" ]
    then
        echo 'No Images found to delete'
    else
        echo "Delete Operation started for IDS:$IMAGEIDS"
        docker images -a | grep "$IMAGENAME" | awk '{print $3}' | xargs docker rmi --force
        echo "Images Deleted for IDS:$IMAGEIDS"
    fi
    echo 'Listing local images after delete'
    docker images -a
fi
