# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a collection of Spring Boot microservices for Rogers Cash & Credit integration (CDE - Cardholder Data Environment). The services handle payment tokenization, batch processing, and vault provider integration.

**Important:** Some repositories are incomplete templates or mislabeled. See notes below.

## Projects Structure

| Project | Build Tool | Actual Service | Status |
|---------|------------|----------------|--------|
| CDE_TSI_0700-main | Gradle | TSI Service - SOAP proxy to TN-Dispatcher | Complete |
| CDE-CIP-TNDISPATCHER-0700-main | Maven | TN-Dispatcher - Cybersource ↔ Moneris translator | Complete |
| CDE-BPS-0700-main | Gradle | BPS - Batch file processing with de-tokenization | Complete |
| CDE-BPS-SCHEDULER-0700-main | Gradle | BPS Scheduler | Incomplete template |
| CDE-CS-PROCCESS-0700-main | Gradle | **MISLABELED** - Actually `cce-ms-creditoptions` (Credit Options service) | Incomplete template |

### Critical Notes

1. **CDE-CS-PROCCESS-0700-main is NOT CS-PROCESS**: Despite the folder name, this is actually `cce-ms-creditoptions` - a Credit Options lookup service unrelated to tokenization. The `settings.gradle` confirms: `rootProject.name = 'cce-ms-creditoptions'`

2. **Missing CS-PROCESS Service**: BPS calls `http://localhost:7060/csprocess/detokenize` for de-tokenization, but the actual CS-PROCESS service code is not in this repository.

3. **Incomplete Repositories**: CDE-CS-PROCCESS-0700-main and CDE-BPS-SCHEDULER-0700-main are templates with only ~6 Java files each, missing core business logic.

## Build Commands

### Gradle Projects (TSI, BPS)
```bash
# Build
./gradlew build

# Run tests
./gradlew test

# Run single test
./gradlew test --tests "ClassName.methodName"

# Run application
./gradlew bootRun

# Create executable JAR
./gradlew bootJar
```

### Maven Project (TN-Dispatcher)
```bash
# Build
mvn clean install

# Run tests
mvn test

# Run single test
mvn test -Dtest=ClassName#methodName

# Run application
mvn spring-boot:run -pl server

# Run from JAR
java -jar server/target/tndispatcher-server-0.1-SNAPSHOT.jar
```

## Architecture

### TN-Dispatcher (CDE-CIP-TNDISPATCHER-0700-main)
Multi-module Maven project that acts as a vault dispatcher:
- **server/** - Main application, runs on port 7050
- **monerismock/** - Mock Moneris service for testing
- Receives Cybersource-format SOAP requests at `/api/dispatch`
- Maps requests to Moneris vault format and dispatches to configured vault provider
- Returns responses in Cybersource format
- Uses Cucumber for BDD testing

Key classes:
- `DispatcherController` - Main entry point for SOAP requests
- `TnMonerisRequestDispatcher` - Handles Moneris vault communication
- `CsToMnRequestMapper` / `MnToCsResponseMapper` - Format converters

### TSI Service (CDE_TSI_0700-main)
Simple SOAP request proxy (passthrough only):
- Receives XML at `/api/dispatch`
- Forwards unchanged to TN-Dispatcher (configured via `tsi.tn.host`, `tsi.tn.port`, `tsi.tn.path`)
- No transformation or business logic
- Package: `com.rogers.cashintegration.tsiservice`

### BPS Service (CDE-BPS-0700-main)
Batch file processing service for de-tokenization:
- REST endpoints under `/semafone/service/integration/rogers/batch/`
  - `POST /put` - Upload batch files for de-tokenization
  - `POST /listfilenames` - List available files
  - `POST /getfile` - Download processed files
- Calls external CS-PROCESS service at `http://localhost:7060/csprocess/detokenize` (service not in repo)
- Supports CPT (Paymentech) and AMEX INT-27 file formats
- Uses Spring Integration for SFTP/FTP file transfers
- PGP encryption via BouncyCastle
- Package: `com.rogers.cashintegration.bpsservice`

### CCE-MS-CreditOptions (CDE-CS-PROCCESS-0700-main) - MISLABELED
**This is NOT CS-PROCESS despite the folder name!**
- Actually a Credit Options lookup service
- Endpoint: `/v1/local_data/account/{accountAlias}/creditoptions`
- Returns credit risk data (deposits, credit limits, risk classes)
- Uses Cassandra (CosmosDB) for data storage
- Incomplete template - missing CreditOptionsService and other core classes

## Configuration

### Spring Profiles
Services use environment-specific YAML/properties files:
- `application-local.yaml` - Local development
- `application-dev.yaml` - Development environment
- `application-pet.yaml` - Performance testing
- `application-qa.yaml` - QA environment

### TN-Dispatcher Configuration
Override defaults with `--spring.config.location=file:///path/to/application.yml`

Key properties:
- `semafone.vault.provider` - Vault provider (MONERIS)
- `semafone.endpoints.moneris` - Moneris endpoint URL
- `semafone.schema.validation.disabled` - XSD validation toggle

### BPS Configuration
Key properties in `application.properties`:
- `cs.process.cs_process_de_token_uri` - CS-PROCESS de-tokenization endpoint
- `cde.batch.local.storage.path` - Local file storage path
- `batch.amex.int_27.*` - AMEX SFTP configuration
- `batch.cpt.*` - CPT SFTP configuration

## Technology Stack
- Java 17
- Spring Boot 3.x (2.x for some templates)
- Lombok for boilerplate reduction
- JAXB for XML marshalling
- BouncyCastle for PGP encryption (BPS)
- Jasypt for property encryption
- Cucumber for BDD testing (TN-Dispatcher)
- Azure Pipelines for CI/CD
- Cassandra/CosmosDB (Credit Options service)

## Testing

TN-Dispatcher uses Cucumber BDD tests:
```bash
# Run Cucumber tests
mvn test -pl server
```

Test endpoints:
- TN-Dispatcher Swagger: http://localhost:7050/swagger-ui.html
- TN-Dispatcher Health: `curl http://localhost:7050/util/get-vault-provider`

## Known Gaps

1. **CS-PROCESS Service**: The actual de-tokenization service called by BPS is not in this codebase
2. **Token Storage**: No code shows how Token ↔ PAN mappings are stored for later de-tokenization
3. **BPS-SCHEDULER**: Template only, missing actual scheduling logic

## Mass-Migration Secondary Repository

The `mass-migration/` folder is synced to a separate repository for restricted access:

- **Main repo:** `git@github.com:phinestsoftware/tokenmigration.git` (this repo)
- **Secondary repo:** `git@github.com:phinestsoftware/rogers-mass-migration.git`

The secondary repo excludes `CLAUDE.md` and other sensitive/build files.

Use the sync script to manage both repos:

```bash
./mass-migration/scripts/sync-to-secondary-repo.sh --help
```
