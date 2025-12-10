#!/bin/bash

# Generate the certificate to enable HTTPS connections to the Mock
# Requires the host IP address as a parameter

CERTIFICATE_FILE=/pkg/monerismock/monerismock.p12

# Ensure JAVA_HOME is defined
if [[ -z $JAVA_HOME ]]
then
    echo "JAVA_HOME not defined - unable to generate cert"
    exit 1;
fi

if [[ $# -ne 1 ]]
then
    echo "Please specify the server IP address as an argument"
    exit 1
fi
IP_ADDRESS=$1

if [[ -f $CERTIFICATE_FILE ]]
then
    read -p "File $CERTIFICATE_FILE already exists, do you want to overwrite (y/n)? " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        exit 1
    fi

    echo "Deleting original certificate $CERTIFICATE_FILE"
    rm $CERTIFICATE_FILE
    if [[ $? -ne 0 ]]
    then
        echo "Failed to delete original certificate file"
        exit 1
    fi
fi

echo "Generating certificate $CERTIFICATE_FILE for server with IP address $IP_ADDRESS"

$JAVA_HOME/jre/bin/keytool -genkey -alias monerismock -storetype PKCS12 -keyalg RSA -keysize 2048 -keystore $CERTIFICATE_FILE -validity 2650 -dname "CN=monerismock, OU=dev, O=semafone, L=guildford, ST=, C=GB" -ext san=ip:$IP_ADDRESS -keypass changeit -storepass changeit

if [[ $? -ne 0 ]]
then
    echo "Failed to generate certificate"
    exit 1
fi

echo "Success"
echo "Certificate file: $CERTIFICATE_FILE"
echo "Key password: changeit"
echo "Keystore password: changeit"
