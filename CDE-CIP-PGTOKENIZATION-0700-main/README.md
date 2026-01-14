# CDE-CIP-PGTOKENIZATION

PG Tokenization Service - Orchestrates the token migration flow from Moneris to Mastercard.

## Overview

This service combines the functionality of TNDispatcher (Moneris) and PGDispatcher (Mastercard) to provide a unified tokenization API. It:

1. Receives Moneris tokens (dataKeys)
2. Calls **TNDispatcher** to retrieve the PAN from Moneris vault
3. Calls **PGDispatcher** to create a Mastercard Payment Gateway token
4. Returns the new PG token along with card metadata

## Flow Diagram

```
┌─────────────────┐    ┌───────────────────┐    ┌──────────────┐    ┌─────────────┐
│  Azure/SSG      │───▶│ PG Tokenization   │───▶│ TNDispatcher │───▶│   Moneris   │
│  (Caller)       │    │    (port 7070)    │    │  (port 7050) │    │    Vault    │
└─────────────────┘    └────────┬──────────┘    └──────────────┘    └─────────────┘
                                │
                                │  PAN
                                ▼
                       ┌───────────────────┐    ┌─────────────────┐
                       │   PGDispatcher    │───▶│   Mastercard    │
                       │   (port 7060)     │    │  Payment Gateway│
                       └───────────────────┘    └─────────────────┘
```

## Project Structure

```
CDE-CIP-PGTOKENIZATION-0700-main/
├── pom.xml
└── src/main/java/com/rogers/pgtokenization/
    ├── PgTokenizationApp.java
    ├── controller/
    │   └── TokenizationController.java
    ├── service/
    │   ├── TokenizationService.java      # Main orchestration logic
    │   ├── TnDispatcherClient.java       # Moneris communication
    │   └── PgDispatcherClient.java       # Mastercard communication
    └── model/
        ├── TokenizeRequest.java
        ├── TokenizeResponse.java
        ├── BatchTokenizeRequest.java
        └── BatchTokenizeResponse.java
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tokenization/tokenize` | Single token conversion (real-time) |
| POST | `/api/tokenization/batch` | Batch token conversion |
| GET | `/api/tokenization/health` | Health check |

## Request/Response Examples

### Single Token Conversion

**Request:**
```json
POST /api/tokenization/tokenize
{
  "correlationId": "entity123",
  "monerisToken": "MONERIS_DATAKEY_12345",
  "merchantId": "SBX_ROGERS",
  "expiryMonth": "12",
  "expiryYear": "25"
}
```

**Response (Success):**
```json
{
  "correlationId": "entity123",
  "monerisToken": "MONERIS_DATAKEY_12345",
  "pgToken": "9703796509383554",
  "result": "SUCCESS",
  "maskedPan": "512345xxxx2346",
  "cardBrand": "MASTERCARD",
  "fundingMethod": "CREDIT",
  "firstSix": "512345",
  "lastFour": "2346",
  "expiryMonth": "12",
  "expiryYear": "25"
}
```

**Response (Error):**
```json
{
  "correlationId": "entity123",
  "monerisToken": "MONERIS_DATAKEY_12345",
  "result": "ERROR",
  "failedStep": "MONERIS_LOOKUP",
  "errorCode": "101",
  "errorMessage": "Token not found"
}
```

### Batch Token Conversion

**Request:**
```json
POST /api/tokenization/batch
{
  "batchId": "batch123",
  "merchantId": "SBX_ROGERS",
  "records": [
    {
      "correlationId": "entity1",
      "monerisToken": "TOKEN_1",
      "expiryMonth": "12",
      "expiryYear": "25"
    },
    {
      "correlationId": "entity2",
      "monerisToken": "TOKEN_2",
      "expiryMonth": "06",
      "expiryYear": "26"
    }
  ]
}
```

**Response:**
```json
{
  "batchId": "batch123",
  "merchantId": "SBX_ROGERS",
  "totalRecords": 2,
  "successCount": 2,
  "errorCount": 0,
  "status": "COMPLETE",
  "results": [
    {
      "correlationId": "entity1",
      "monerisToken": "TOKEN_1",
      "pgToken": "9703796509383554",
      "result": "SUCCESS",
      ...
    },
    {
      "correlationId": "entity2",
      "monerisToken": "TOKEN_2",
      "pgToken": "9704111111111111",
      "result": "SUCCESS",
      ...
    }
  ]
}
```

## Build & Run

### Prerequisites
- Java 17
- Maven 3.8+
- TNDispatcher running on port 7050
- PGDispatcher running on port 7060

### Build
```bash
cd CDE-CIP-PGTOKENIZATION-0700-main
mvn clean install
```

### Run
```bash
mvn spring-boot:run
```

### Run with Custom Endpoints
```bash
mvn spring-boot:run \
  -Dtndispatcher.base.url=http://tn-dispatcher:7050 \
  -Dpgdispatcher.base.url=http://pg-dispatcher:7060
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TNDISPATCHER_URL` | TNDispatcher base URL | `http://localhost:7050` |
| `PGDISPATCHER_URL` | PGDispatcher base URL | `http://localhost:7060` |

## Error Handling

The service returns detailed error information including:
- `failedStep`: Which step failed (`MONERIS_LOOKUP` or `MASTERCARD_TOKENIZE`)
- `errorCode`: Error code from the failing service
- `errorMessage`: Human-readable error description

## Dependencies

This service depends on:
1. **TNDispatcher** (CDE-CIP-TNDISPATCHER-0700-main) - For Moneris vault communication
2. **PGDispatcher** (CDE-CIP-PGDISPATCHER-0700-main) - For Mastercard API communication

## Testing

For local testing, use the Mastercard Mock service included in PGDispatcher and the Moneris Mock included in TNDispatcher.

```bash
# Terminal 1: Start Moneris Mock (from TNDispatcher)
cd CDE-CIP-TNDISPATCHER-0700-main
mvn spring-boot:run -pl monerismock

# Terminal 2: Start TNDispatcher
cd CDE-CIP-TNDISPATCHER-0700-main
mvn spring-boot:run -pl server -Dsemafone.endpoints.moneris=http://localhost:7051/moneris

# Terminal 3: Start Mastercard Mock
cd CDE-CIP-PGDISPATCHER-0700-main
mvn spring-boot:run -pl mastercardmock

# Terminal 4: Start PGDispatcher
cd CDE-CIP-PGDISPATCHER-0700-main
mvn spring-boot:run -pl server

# Terminal 5: Start PG Tokenization
cd CDE-CIP-PGTOKENIZATION-0700-main
mvn spring-boot:run
```
