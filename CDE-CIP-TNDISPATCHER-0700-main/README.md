
Tn-Dispatcher
=========================================

Summary
-------
 A multi vault Dispatcher component to proxy/map calls made to tokenization provider.
 
 It assumes all requests are in Cybersource format and does necessary mapping when required
 All responses for core functionality are returned in Cybersource format.
------------

* Java 8 (Mandatory)
* Mongo 3.x (Mandatory)

Maven Build
------------

```bash
    git clone git@geralt.semafone.com:50022/home/git/rogers/tn-dispatcher.git
    mvn clean install
```

Maven Run
----------------

```bash
    mvn spring-boot:run
```

Command Line Run
----------------

```bash
	cd server/target/
    java -jar tndispatcher-server-0.1-SNAPSHOT.jar
```

Test
-------------------

```bash
    curl http://localhost:7050/util/get-vault-provider

    {
        "vaultProvider": "MONERIS"
    }
```

Endpoints (based on default settings)
----------------------------------
* Swagger - <http://localhost:7050/swagger-ui.html>
* Dispatcher endpoint - <http://localhost:7050/api/dispatch>

Configuration
----------------------------------

|                Property                 |                 Description                 |                 Default Value                  |  
| --------------------------------------- | ------------------------------------------- | ---------------------------------------------- |  
| server.port                   | Spring config - port the server is started on | 7050 |
| server.tomcat.max-connections | Spring config - maximum number of inbound requests   | 100 |
| server.compression.enabled    | Spring config - enables/disables compression of responses | true |
| server.compression.mime-types | Spring config - supported mime types | application/xml,text/html,text/xml,text/plain |
| logging.file | full file name, excluding rollingpattern.log  | {environment temp location}/semafone-audit and is suffixed with rolling pattern (%d{yyyy-MM-dd}.log) |
| logging.path | path where log file will be created. If set, it replaces path part of logging.file property defined above  | {environment temp location} or '/tmp' if not set |
| semafone.vault.provider | Vault provider name the dispatcher directs requests to | Moneris |  
| semafone.endpoints.moneris     | URL to Moneris service | not set |  
| semafone.https.certificate.allowUntrusted | Flag to toggle accessibility of untrusted vault provider servers  | false |  
| semafone.https.certificate.skipValidationFor | List of IP prefixes. If 'allowUntrusted' is true, allow untrusted certificates for specified list  | unset |  
| semafone.http.max.connections | max connections available in pool manager  | 100 |  
| semafone.http.request.connection.timeout.millis | timeout in milliseconds used when requesting a connection from the connection manager  | 100 |  
| semafone.http.connect.timeout.millis | timeout in milliseconds for establishing connection   | 5000 |  
| semafone.schema.validation.disabled | When set, disables validation of requests / responses against Cybersource/Moneris XSD  | false |  

Overriding Default Configuration
----------------------------------
The application should startup as is provided that all the mandatory dependencies are installed correctly
on the same host as tn-dispatcher is being to deployed to.

In case any of the properties above need overriding, create a yml config file somewhere in the file system i.e: `application.yml` with the relevant
overrides and make sure you start the tn-dispatcher from the command line with the `--spring.config.location` parameter pointing to the config path i.e: file:///opt/tn-dispatcher/my-config/application.yml.

Note: You can use the Spring Boot Admin UI to verify that your properties have been correctly loaded in the _Environments_ page.

For more information please refer to: <https://docs.spring.io/spring-boot/docs/current/reference/html/boot-features-external-config.html>


Eclipse
----------------------------------

* From the File Menu select `Import ... > Existing Maven Projects`
* Browse to the root directory of the cloned repository
* Select all projects and click `Finish`
