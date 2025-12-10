#!/bin/bash

function logError {
   RED='\033[0;31m' 
   NC='\033[0m' 
   echo -e "${RED}ERROR:${NC} $1"
}

function resolveSpringBootConfiguration(){
   local appName=$1
   if [ -z "$appName" ]; then
      logError "<appName> argument missing"
      exit 1
   fi
   local ymlConfigFile="$SOURCE/config/$appName-default.yml"
   if [ -f "$ymlConfigFile" ]; then
      APP_CONFIG_DEFAULTS="--spring.config.location=$ymlConfigFile"
      echo "setting APP_CONFIG_DEFAULTS =[$APP_CONFIG_DEFAULTS]"
   fi
}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

VM_TUNING_2G="-Xmx1500m -XX:NewRatio=50 -XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:+HeapDumpOnOutOfMemoryError -XX:-DisableExplicitGC -XX:+AggressiveOpts -Xnoclassgc -XX:+UseNUMA -XX:+UseFastAccessorMethods -XX:ReservedCodeCacheSize=48m -XX:+UseStringDeduplication -XX:MaxGCPauseMillis=500 -XX:GCPauseIntervalMillis=7000"
BASE=$SCRIPT_DIR
SOURCE=$BASE
SCRIPTS=$BASE/scripts
HOSTIP=$(ip route show | awk '/default/ {print $3}')
JDK8="/pkg/dpm/java"

echo "SCRIPT_DIR: $SCRIPT_DIR"
echo "BASE: $BASE"
echo "HOSTIP    : $HOSTIP"
# APP-SPECIFIC   ----------------------------------------------------------------------
#   OBLIGATORY - APP NAMES  ---------------
APP_ID="tndispatcher"
APP_NAME="tndispatcher"
APP_JAR="/pkg/tndispatcher/tndispatcher-server.jar"
PID_FILE="/var/run/tndispatcher/tndispatcher.pid"
            
# GENERIC app startup   --------------------------

resolveSpringBootConfiguration "$APP_NAME" # sets APP_CONFIG_DEFAULTS

stopScript="$BASE/stop_dispatcher.sh"
if [ -f "$PID_FILE" ]; then
existingPID=$(<"$PID_FILE")
                      
existingProcess=`pgrep -f '/pkg/dpm/java/bin/java -DSMF_APP=tndispatcher'`

if [ ! -z "$existingProcess" ]; then
	logError "Dispatcher process is already running [PID=$existingPID]"

exit 1;
	 else      
    echo "stop_dispatcher.sh exists.  It will be overriden."
                                                      fi
     fi 

$JDK8/bin/java -DSMF_APP=$APP_ID -Dspring.output.ansi.enabled=ALWAYS -jar $APP_JAR $APP_CONFIG_DEFAULTS 2>&1 &
PID=$!

echo process id $PID

echo -e "PID=$PID\nkill -9 $PID" > $stopScript && chmod +x $stopScript

echo $PID > /var/run/tndispatcher/tndispatcher.pid
