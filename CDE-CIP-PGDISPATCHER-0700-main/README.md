# CDE-CIP-PGDISPATCHER

Payment Gateway Dispatcher service for Mastercard tokenization operations. This service wraps Mastercard Payment Gateway APIs for batch and real-time token operations.

## Overview

PG Dispatcher provides a unified interface to Mastercard Payment Gateway for:
- **Batch tokenization** - Submit batches of PANs for tokenization
- **Batch status** - Check the processing status of submitted batches
- **Batch results** - Retrieve tokens from completed batches
- **Real-time tokenization** - Create individual tokens on-demand

## Project Structure

```
CDE-CIP-PGDISPATCHER-0700-main/
├── pom.xml                    # Parent POM
├── server/                    # Main PG Dispatcher service
│   ├── pom.xml
│   └── src/main/java/com/rogers/pgdispatcher/
│       ├── PgDispatcherApp.java
│       ├── controller/
│       │   └── PgDispatcherController.java
│       ├── service/
│       │   ├── MastercardApiService.java
│       │   ├── MastercardApiServiceImpl.java
│       │   └── CsvService.java
│       ├── model/
│       │   ├── BatchSubmitRequest.java
│       │   ├── BatchSubmitResponse.java
│       │   ├── BatchStatusResponse.java
│       │   ├── BatchResultResponse.java
│       │   ├── CreateTokenRequest.java
│       │   └── CreateTokenResponse.java
│       └── constants/
│           └── Constants.java
└── mastercardmock/           # Mock Mastercard service for testing
    ├── pom.xml
    └── src/main/java/com/rogers/mastercardmock/
        ├── MockMastercardApp.java
        ├── controller/
        │   ├── BatchController.java
        │   └── TokenController.java
        ├── service/
        │   ├── BatchStore.java
        │   └── BatchProcessor.java
        └── profile/
            ├── CardProfile.java
            └── MockData.java
```

## API Endpoints

### PG Dispatcher Server (port 7060)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pg/batch/submit` | Submit a batch of tokenization requests |
| GET | `/api/pg/batch/status/{batchId}?merchantId=xxx` | Get batch status |
| GET | `/api/pg/batch/result/{batchId}?merchantId=xxx` | Get batch results |
| POST | `/api/pg/token/create` | Create a single token (real-time) |
| GET | `/api/pg/health` | Health check |

### Mastercard Mock (port 7061)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/batch/version/{v}/merchant/{m}/batch/{id}` | Submit batch (CSV) |
| GET | `/batch/version/{v}/merchant/{m}/batch/{id}/status` | Get batch status |
| GET | `/batch/version/{v}/merchant/{m}/batch/{id}/response` | Get batch results |
| POST | `/api/rest/version/{v}/merchant/{m}/token` | Create token (JSON) |

## Build & Run

### Prerequisites
- Java 17
- Maven 3.8+

### Build
```bash
cd CDE-CIP-PGDISPATCHER-0700-main
mvn clean install
```

### Run Mock Service (for testing)
```bash
mvn spring-boot:run -pl mastercardmock
```

### Run PG Dispatcher Server
```bash
# Configure to point to mock service (default)
mvn spring-boot:run -pl server

# Or configure to point to real Mastercard
mvn spring-boot:run -pl server -Dmastercard.api.base.url=https://pki.mtf.gateway.mastercard.com
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MASTERCARD_API_URL` | Mastercard API base URL | `http://localhost:7061` |
| `MASTERCARD_API_VERSION` | API version | `73` |
| `MASTERCARD_API_PASSWORD` | API password | - |

## Test Cards (Mock Service)

| PAN | Token | Card Brand | Result |
|-----|-------|------------|--------|
| 5123456789012346 | 9703796509383554 | MASTERCARD | SUCCESS |
| 4111111111111111 | 9704111111111111 | VISA | SUCCESS |
| 378282246310005 | 9703782822463100 | AMEX | SUCCESS |
| 4000000000000002 | - | VISA | ERROR (Invalid) |
| 5000000000000009 | - | MASTERCARD | ERROR (Expired) |

## Example Requests

### Submit Batch
```bash
curl -X POST http://localhost:7060/api/pg/batch/submit \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "batch123",
    "merchantId": "SBX_ROGERS",
    "records": [
      {
        "correlationId": "acc1",
        "pan": "5123456789012346",
        "expiryMonth": "12",
        "expiryYear": "25",
        "email": "test@test.com"
      }
    ]
  }'
```

### Get Batch Status
```bash
curl "http://localhost:7060/api/pg/batch/status/batch123?merchantId=SBX_ROGERS"
```

### Create Single Token
```bash
curl -X POST http://localhost:7060/api/pg/token/create \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "SBX_ROGERS",
    "correlationId": "tx123",
    "pan": "5123456789012346",
    "expiryMonth": "12",
    "expiryYear": "25",
    "currency": "CAD"
  }'
```
