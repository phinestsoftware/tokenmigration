#!/usr/bin/env bash

c:\tools\Java\apache-jmeter-3.0>bin\jmeter -n -JtndispatcherIP=10.20.17.2 -Jusers=150 -JloopCount=10 -t "c:\Users\Maciej\Google Drive\_uk\Angabit\Semafone\tests\load-test-vaultOps.jmx" -o report.log -j console.log