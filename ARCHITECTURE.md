# Rogers CDE Architecture

This document describes the architecture and data flow of the Rogers Cash & Credit Integration (CDE) microservices.

## System Overview

The CDE platform handles payment tokenization through two main paths:
- **Real-time**: Individual payment requests processed synchronously via Moneris vault
- **Batch**: Bulk file processing for de-tokenization (token → PAN replacement)

**Important:** This codebase is incomplete. The CS-PROCESS service that handles de-tokenization is not included.

---

## Real-Time Tokenization Flow

```
┌──────────────────┐      SOAP/XML       ┌──────────────────┐      SOAP/XML       ┌──────────────────┐
│                  │    (Cybersource     │                  │    (Cybersource     │                  │
│  External System │      format)        │   TSI Service    │      format)        │  TN-Dispatcher   │
│  (e.g., POS,     │ ─────────────────▶  │                  │ ─────────────────▶  │                  │
│   Call Center)   │                     │  /api/dispatch   │                     │  Port: 7050      │
│                  │ ◀─────────────────  │                  │ ◀─────────────────  │  /api/dispatch   │
│                  │      Response       │  (Pure Proxy)    │      Response       │                  │
└──────────────────┘                     └──────────────────┘                     └────────┬─────────┘
                                                                                           │
                                                                                           │ Translates
                                                                                           │ Cybersource → Moneris
                                                                                           │
                                                                                           ▼
                                                                                  ┌──────────────────┐
                                                                                  │                  │
                                                                                  │  Moneris Vault   │
                                                                                  │  (Tokenization   │
                                                                                  │   Provider)      │
                                                                                  │                  │
                                                                                  └──────────────────┘
```

### Components

| Component | Role | Endpoint | Status |
|-----------|------|----------|--------|
| **TSI Service** | Simple HTTP proxy (passthrough) | `/api/dispatch` | In codebase |
| **TN-Dispatcher** | Format translator (Cybersource ↔ Moneris) | `/api/dispatch` (port 7050) | In codebase |
| **Moneris Vault** | External tokenization provider | Configured via `semafone.endpoints.moneris` | External |

### Request Flow

1. External system sends SOAP/XML request in **Cybersource format**
2. TSI Service receives and forwards request unchanged to TN-Dispatcher
3. TN-Dispatcher translates Cybersource format to **Moneris format**
4. Request sent to Moneris Vault for tokenization
5. Moneris response translated back to Cybersource format
6. Response returned through the chain

**Note:** No database storage occurs in this flow. The token is returned to the caller but not persisted by these services.

---

## Batch Processing Flow (De-tokenization)

```
┌──────────────────┐                     ┌──────────────────┐      REST/XML       ┌──────────────────┐
│                  │      Triggers       │                  │    (De-tokenize)    │                  │
│  BPS-SCHEDULER   │ ──────────────────▶ │   BPS Service    │ ─────────────────▶  │   CS-PROCESS     │
│                  │   (Scheduled Jobs)  │                  │                     │   (NOT IN REPO)  │
│  (Template only) │                     │  /batch/put      │ ◀─────────────────  │                  │
│                  │                     │  /batch/getfile  │   Token-PAN Map     │  Port: 7060      │
│                  │                     │  /batch/list...  │                     │  /csprocess/     │
└──────────────────┘                     └────────┬─────────┘                     └────────┬─────────┘
                                                  │                                        │
                                                  │ File Upload/Download                   │ How does it
                                                  │ (PGP Encrypted)                        │ de-tokenize?
                                                  ▼                                        ▼
                                         ┌──────────────────┐                     ┌──────────────────┐
                                         │                  │                     │                  │
                                         │   SFTP/FTP       │                     │   UNKNOWN        │
                                         │   Server         │                     │   (Moneris or    │
                                         │                  │                     │    Database?)    │
                                         │  (Batch Files)   │                     │                  │
                                         └──────────────────┘                     └──────────────────┘
```

### Components

| Component | Role | Endpoints | Status |
|-----------|------|-----------|--------|
| **BPS-SCHEDULER** | Triggers scheduled batch jobs | N/A (scheduler) | Template only |
| **BPS Service** | Handles file operations and batch processing | `/batch/put`, `/batch/getfile`, `/batch/listfilenames` | In codebase |
| **CS-PROCESS** | De-tokenization service (Token → PAN) | `http://localhost:7060/csprocess/detokenize` | **NOT IN CODEBASE** |
| **SFTP/FTP Server** | Secure file storage | External | External |

### Batch Endpoints (BPS Service)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/semafone/service/integration/rogers/batch/put` | POST | Upload batch files for de-tokenization |
| `/semafone/service/integration/rogers/batch/getfile` | POST | Download processed files |
| `/semafone/service/integration/rogers/batch/listfilenames` | POST | List available files |

### Batch Processing Logic (What We Know)

1. **File Upload** (`/batch/put`):
   - Receive batch file (TXT or ZIP format)
   - Extract tokens from file based on file type (CPT or AMEX INT-27)
   - Call CS-PROCESS to de-tokenize (convert tokens back to PANs)
   - Replace tokens with PANs in the file content
   - Store processed file via SFTP/FTP

2. **Supported File Types**:
   - **CPT (Paymentech)**: Token at positions 24-42
   - **AMEX INT-27**: Token at fixed positions in 400-character records

### Unknown: How De-tokenization Works

The CS-PROCESS service is not in this codebase. Open questions:
- Does CS-PROCESS call Moneris for each token lookup?
- Does CS-PROCESS have its own database with Token ↔ PAN mappings?
- If there's a database, when/how are mappings stored during tokenization?

---

## Complete System View

```
                    ┌─────────────────── REAL-TIME PATH ───────────────────┐
                    │                        (IN CODEBASE)                  │
                    ▼                                                       ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  External  │───▶│    TSI     │───▶│    TN-     │───▶│  Moneris   │
│  Systems   │◀───│  Service   │◀───│ Dispatcher │◀───│   Vault    │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                   (proxy only)      (translator)      (external)


                    ┌─────────────────── BATCH PATH ───────────────────────┐
                    │                                                       │
                    ▼                                                       ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│    BPS     │───▶│    BPS     │───▶│ CS-PROCESS │    │  SFTP/FTP  │
│ SCHEDULER  │    │  Service   │◀───│ (MISSING!) │    │  Server    │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
 (template)        (in codebase)     (not in repo)         ▲
                        │                                   │
                        └───────────────────────────────────┘
                              File Upload/Download (PGP)
```

---

## Service Summary

| Service | Repository | Build | Purpose | Status |
|---------|------------|-------|---------|--------|
| **TSI Service** | CDE_TSI_0700-main | Gradle | HTTP proxy to TN-Dispatcher | Complete |
| **TN-Dispatcher** | CDE-CIP-TNDISPATCHER-0700-main | Maven | Translates Cybersource ↔ Moneris | Complete |
| **BPS Service** | CDE-BPS-0700-main | Gradle | Batch file processing | Complete |
| **BPS-SCHEDULER** | CDE-BPS-SCHEDULER-0700-main | Gradle | Scheduled job runner | Template only |
| **CS-PROCESS** | Not in repository | - | De-tokenization | **MISSING** |

---

## Mislabeled Repository: CDE-CS-PROCCESS-0700-main

**This repository is NOT CS-PROCESS!**

Despite the folder name suggesting it's "CS-PROCESS", this is actually **CCE-MS-CreditOptions** - a completely different service.

| What folder says | What it actually is |
|------------------|---------------------|
| CDE-CS-PROCCESS-0700-main | `cce-ms-creditoptions` |

### What CCE-MS-CreditOptions Does

It's a **Credit Options lookup service** (unrelated to tokenization):

```
┌─────────────────┐    GET /creditoptions    ┌─────────────────────┐    Query    ┌─────────────────┐
│                 │ ───────────────────────▶ │                     │ ──────────▶ │                 │
│  Client App     │                          │  CreditOptions      │             │  Cassandra DB   │
│                 │ ◀─────────────────────── │  Controller         │ ◀────────── │  (CosmosDB)     │
└─────────────────┘    Credit risk JSON      └─────────────────────┘             └─────────────────┘
```

**Endpoint:** `/v1/local_data/account/{accountAlias}/creditoptions`

**Returns:** Credit risk data like deposits, credit limits, risk classes

**Status:** Incomplete template - missing `CreditOptionsService` and other core classes

---

## Key Difference: Real-Time vs Batch

| Aspect | Real-Time | Batch |
|--------|-----------|-------|
| **Provider** | Moneris Vault | CS-PROCESS (missing) |
| **Operation** | Tokenization (PAN → Token) | De-tokenization (Token → PAN) |
| **Protocol** | SOAP/XML (Cybersource format) | REST/XML + File Transfer |
| **Use Case** | Live payment transactions | Bulk file processing for settlement |
| **Code Available** | Yes | Partial (CS-PROCESS missing) |

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Runtime** | Java 17, Spring Boot 3.x |
| **API Format** | SOAP/XML (Cybersource format for real-time), REST/XML (batch) |
| **File Transfer** | SFTP, FTP via Spring Integration |
| **Encryption** | PGP (BouncyCastle), Jasypt |
| **Vault Provider** | Moneris (real-time only) |
| **CI/CD** | Azure Pipelines |

---

## Notes

### TSI Service Redundancy
The TSI Service currently acts as a pure passthrough proxy. It forwards requests to TN-Dispatcher without any transformation. Possible reasons:
- Network segmentation (sits in a different security zone)
- Future expansion placeholder
- Legacy compatibility layer

### Security Considerations
- All batch files are PGP encrypted
- Card data is tokenized via Moneris vault (PCI DSS compliance)
- De-tokenization happens within secure CDE environment
- Services communicate over internal network

### Known Gaps in Codebase
1. **CS-PROCESS Service**: The de-tokenization service is not included
2. **Token Storage Mechanism**: Unknown how Token ↔ PAN mappings are persisted
3. **BPS-SCHEDULER Logic**: Only template code, no actual scheduling implementation
4. **CCE-MS-CreditOptions**: Incomplete, missing service layer
