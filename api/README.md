# OneSat API Reference

A RESTful API service for OneSat that provides asset information, price data, and integration with the Vesu protocol.

## Base URL

```
http://localhost:4433
```

## Authentication

Currently, no authentication is required for API access.

## Response Format

All API responses follow a consistent format:

```json
{
  "status": "Ok" | "Error",
  "result": <response_data>,
  "error": <error_message>
}
```

- `status`: Indicates success (`"Ok"`) or failure (`"Error"`)
- `result`: Contains the response data when successful
- `error`: Contains error details when the request fails

## Endpoints

### Health Check

Check if the API service is running.

**Endpoint:** `GET /health`

**Response:**
```
Online
```

**Example:**
```bash
curl http://localhost:4433/health
```

### Create Deposit

Create a new deposit and get the deposit address for tracking.

**Endpoint:** `POST /deposit`

**Request Body:**
```json
{
  "user_address": "0x123...",
  "action": 1,
  "amount": "1000000000000000000",
  "token": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  "target_address": "0x456..."
}
```

**Parameters:**
- `user_address` (required): User's wallet address (hex string)
- `action` (required): Action type identifier (u128)
- `amount` (required): Deposit amount as string (must be positive)
- `token` (required): Token contract address (hex string)
- `target_address` (required): Target address for the deposit (hex string)

**Response:**
```json
{
  "status": "Ok",
  "result": {
    "deposit_id": "0x1234567890abcdef...",
    "user_address": "0x123...",
    "action": 1,
    "amount": "1000000000000000000",
    "token": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "target_address": "0x456...",
    "deposit_address": "0x789...",
    "status": "created",
    "created_at": "2024-10-09T12:34:56Z"
  }
}
```

**Deposit Status:**
- `created`: Initial state when deposit is created (default)
- `initiated`: User has initiated the deposit transaction
- `deposited`: Deposit has been confirmed on-chain (finalized)

**Example:**
```bash
curl -X POST http://localhost:4433/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "user_address": "0x123...",
    "action": 1,
    "amount": "1000000000000000000",
    "token": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "target_address": "0x456..."
  }'
```

### Get Deposit

Retrieve details of a specific deposit by its ID.

**Endpoint:** `GET /deposit/:deposit_id`

**Path Parameters:**
- `deposit_id` (required): The 32-byte deposit ID as a hex string (with or without 0x prefix)

**Response:**
```json
{
  "status": "Ok",
  "result": {
    "deposit_id": "0x1234567890abcdef...",
    "user_address": "0x123...",
    "action": 1,
    "amount": "1000000000000000000",
    "token": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "target_address": "0x456...",
    "deposit_address": "0x789...",
    "status": "created",
    "created_at": "2024-10-09T12:34:56Z"
  }
}
```

**Error Response (404):**
```json
{
  "status": "Error",
  "error": "Deposit not found"
}
```

**Example:**
```bash
curl http://localhost:4433/deposit/0x1234567890abcdef...
```

### Supported Assets

Get a list of all supported assets with their current prices.

**Endpoint:** `GET /assets`

**Response:**
```json
{
  "status": "Ok",
  "result": [
    {
      "name": "Ether",
      "symbol": "ETH",
      "decimals": 18,
      "coingecko_id": "ethereum",
      "address": "0x07bb0505dde7c05f576a6e08e64dadccd7797f14704763a5ad955727be25e5e9",
      "price": "2500.45"
    }
  ],
  "error": null
}
```

**Example:**
```bash
curl http://localhost:4433/assets
```

## Vesu Protocol Integration

### Get User Positions

Retrieve positions for a specific wallet address.

**Endpoint:** `GET /vesu/postions`

**Query Parameters:**
- `walletAddress` (required): The wallet address to query positions for

**Example:**
```bash
curl "http://localhost:4433/vesu/postions?walletAddress=0x123..."
```

**Response:**
```json
{
  "status": "Ok",
  "result": {
    // Position data from Vesu API
  },
  "error": null
}
```

### Get User History

Retrieve transaction history for a specific wallet address.

**Endpoint:** `GET /vesu/history`

**Query Parameters:**
- `walletAddress` (required): The wallet address to query history for

**Example:**
```bash
curl "http://localhost:4433/vesu/history?walletAddress=0x123..."
```

**Response:**
```json
{
  "status": "Ok",
  "result": {
    // History data from Vesu API
  },
  "error": null
}
```

### Get Pools

Retrieve pool information from Vesu protocol.

**Endpoint:** `GET /vesu/pools`

**Query Parameters:**
- `poolAddress` (optional): Specific pool address to query. If not provided, returns all pools.

**Examples:**
```bash
# Get all pools
curl http://localhost:4433/vesu/pools

# Get specific pool
curl "http://localhost:4433/vesu/pools?poolAddress=0x456..."
```

**Response:**
```json
{
  "status": "Ok",
  "result": {
    // Pool data from Vesu API
  },
  "error": null
}
```

## Supported Assets

The API currently supports the following assets:

| Name | Symbol | Decimals | CoinGecko ID | Address |
|------|--------|----------|--------------|---------|
| Ether | ETH | 18 | ethereum | 0x07bb0505dde7c05f576a6e08e64dadccd7797f14704763a5ad955727be25e5e9 |
| Wrapped BTC | WBTC | 18 | bitcoin | 0x00abbd6f1e590eb83addd87ba5ac27960d859b1f17d11a3c1cd6a0006704b141 |
| USD Coin | USDC | 18 | usd-coin | 0x0715649d4c493ca350743e43915b88d2e6838b1c78ddc23d6d9385446b9d6844 |
| Tether USD | USDT | 18 | tether | 0x041301316d5313cb7ee3389a04cfb788db7dd600d6369bc1ffd7982d6d808ff4 |
| Wrapped Staked Ether | wstETH | 18 | staked-ether | 0x0173d770db353707f2bfac025f760d2a45a288e06f56d48d545bcbdcebe3daa2 |
| Starknet Token | STRK | 18 | starknet | 0x01278f23115f7e8acf07150b17c1f4b2a58257dde88aad535dbafc142edbd289 |
| Relend Network USDC | rUSDC-stark | 6 | relend-network-usdc | 0x01c5814d7b2e7e38f10d38128c8e5e219fe610fc7a36ad86b78afb325dd2d9bd |

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server error

Error responses include details in the `error` field:

```json
{
  "status": "Error",
  "result": null,
  "error": "Error message describing what went wrong"
}
```

## Configuration

The API is configured via `settings.json`:

```json
{
  "port": 4433,
  "coingecko": {
    "price_api_url": "https://api.coingecko.com/api/v3/simple/price",
    "api_key": "your-api-key",
    "update_interval_secs": 60,
    "cache_ttl_secs": 120
  },
  "vesu_api_base_url": "https://dev.api.vesu.xyz",
  "supported_assets": [...]
}
```