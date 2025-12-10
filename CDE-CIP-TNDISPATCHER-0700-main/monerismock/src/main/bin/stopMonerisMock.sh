#!/bin/bash

######Moneris Mock stop Script######
##Script to stop Moneris mock##

MnrsMckPID=`ps -ef|grep monerismock*.jar|grep -v grep|awk '{print $2}'`

if [[ -z "$MnrsMckPID" ]];
then
(
    echo "Moneris Mock Not Running...."
)
else
(
    echo "Moneris Mock process $MnrsMckPID getting stopped......."
    kill -9 $MnrsMckPID
    echo "Moneris Mock process $MnrsMckPID stopped.............."
)fi
