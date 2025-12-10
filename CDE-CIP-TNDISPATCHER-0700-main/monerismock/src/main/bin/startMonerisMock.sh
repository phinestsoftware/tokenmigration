#!/bin/bash

#####Moneris Mock start Script#####
##Make sure the Mule is started and TnDispatcher is running##

MnrsMckPID=`ps -ef|grep monerismock*.jar|grep -v grep|awk '{print $2}'`

if [[ -z "$MnrsMckPID" ]];
then
(
    echo "Moneris Mock Not Running....Starting Moneris Mock"
    C:/D-Drive/Java/jdk1.8.0_361/bin/java -jar C:/Users/Farheen.Syed/Downloads/CIPSC/tn-dispatcher/monerismock/target/monerismock-0.0.1-SNAPSHOT.jar 2>&1 >> C:/Users/Farheen.Syed/Downloads/CIPSC/tn-dispatcher/monerismock/monerismock.log &
    echo "Moneris Mock Started........"
)
else
(
    echo "Moneris Mock instance already running - PID $MnrsMckPID - Stopping Moneris Mock PID $MnrsMckPID......."
    kill -9 $MnrsMckPID
    echo "Moneris Mock instance - PID $MnrsMckPID stopped.............."
    echo "Starting new instance of Moneris Mock"
    /usr/bin/java -jar /pkg/monerismock/monerismock-0.0.1-SNAPSHOT.jar 2>&1 >> /pkg/monerismock/monerismock.log &
    echo "New Instance of Moneris Mock Started........"    
)fi
