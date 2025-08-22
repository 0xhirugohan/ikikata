# Sleep Tracking API Documentation

A secure sleep tracking API using ECDSA-based authentication where private keys never leave the client.

## Overview

This API provides endpoints for:
- **Account Management**: Register accounts using ECDSA public keys
- **Authentication**: Challenge-response authentication without transmitting private keys
- **Sleep Data**: CRUD operations for sleep tracking data
- **Analytics**: Sleep pattern analysis and recommendations

## Authentication Flow

1. **Client generates ECDSA key pair** (P-256 curve)
2. **Register account** with public key → Server stores public key with account ID
3. **Request challenge** from server → Server returns temporary challenge
4. **Sign challenge** with private key → Client sends signature
5. **Server verifies signature** using stored public key → Grants access

## API Endpoints

### Health & Status

#### `GET /health`
Health check endpoint
```json
{
  "status": "healthy",
  "timestamp": "2023-...",
  "version": "1.0.0",
  "message": "Sleep tracking server is running"
}
```

#### `GET /health/stats`
Database statistics
```json
{
  "totalAccounts": 10,
  "activeChallenges": 2,
  "totalSleepEntries": 150,
  "timestamp": "2023-..."
}
```

---

### Authentication

#### `POST /auth/register`
Register a new account with public key

**Request:**
```json
{
  "publicKey": "base64-encoded-spki-public-key"
}
```

**Response:**
```json
{
  "success": true,
  "accountId": "generated-account-id",
  "message": "Account registered successfully"
}
```

#### `POST /auth/challenge`
Request authentication challenge

**Request:**
```json
{
  "accountId": "your-account-id"
}
```

**Response:**
```json
{
  "challenge": "random-challenge-string",
  "expiresAt": 1640995200000,
  "message": "Challenge generated successfully"
}
```

#### `POST /auth/verify` *(Testing only)*
Verify signed challenge

**Request:**
```json
{
  "accountId": "your-account-id",
  "challenge": "challenge-from-server",
  "signature": "base64-encoded-signature"
}
```

**Response:**
```json
{
  "valid": true,
  "accountId": "your-account-id",
  "message": "Signature verified successfully"
}
```

#### `GET /auth/account/:accountId`
Get public account information

**Response:**
```json
{
  "accountId": "account-id",
  "createdAt": "2023-...",
  // TODO: email field will be added when email binding is implemented
}
```

---

### Sleep Data *(Requires Authentication)*

All sleep endpoints require authentication via `Authorization: Bearer {accountId}.{signature}.{challenge}` header.

#### `POST /sleep/entries`
Add new sleep entry

**Request:**
```json
{
  "id": "unique-entry-id",
  "date": "2023-12-31",
  "sleepQuality": "good|fair|poor",
  "morningEnergy": "energized|alert|tired|exhausted",
  "timeToFallAsleep": "under-10|10-20|20-30|30-60|over-60",
  "afternoonEnergy": "energized|alert|tired|exhausted",
  "notes": "Optional notes",
  "stressLevel": 5,
  "screenTime": 2.5,
  "roomTemp": 70,
  "caffeineTime": "14:30",
  "exerciseTime": "18:00",
  "preBedtimeActivities": "reading",
  "anxietyLevel": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sleep entry added successfully"
}
```

#### `GET /sleep/entries?limit=50`
Get sleep entries for authenticated user

**Response:**
```json
{
  "entries": [
    {
      "id": "entry-id",
      "accountId": "account-id",
      "date": "2023-12-31",
      "sleepQuality": "good",
      // ... other fields
      "createdAt": "2023-..."
    }
  ],
  "count": 25
}
```

#### `PUT /sleep/entries/:entryId`
Update sleep entry

**Request:** Partial sleep entry data
**Response:**
```json
{
  "success": true,
  "message": "Sleep entry updated successfully"
}
```

#### `DELETE /sleep/entries/:entryId`
Delete sleep entry

**Response:**
```json
{
  "success": true,
  "message": "Sleep entry deleted successfully"
}
```

#### `GET /sleep/analytics`
Get sleep analytics and insights

**Response:**
```json
{
  "averageSleepQuality": 2.5,
  "averageMorningEnergy": 3.2,
  "averageAfternoonEnergy": 2.8,
  "sleepOnsetTrend": 3.5,
  "totalEntries": 30,
  "streakDays": 7,
  "recommendations": [
    "Your sleep patterns look good! Keep it up."
  ]
}
```

---

## Authentication Example

### JavaScript Client Example

```javascript
// 1. Register account
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ publicKey: 'base64-public-key' })
});
const { accountId } = await response.json();

// 2. Get challenge
const challengeResponse = await fetch('/auth/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId })
});
const { challenge } = await challengeResponse.json();

// 3. Sign challenge with private key
const signature = await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" },
  privateKey,
  new TextEncoder().encode(challenge)
);
const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

// 4. Make authenticated requests
const authHeader = `Bearer ${accountId}.${signatureB64}.${challenge}`;
const dataResponse = await fetch('/sleep/entries', {
  headers: { 'Authorization': authHeader }
});
```

---

## Security Features

- ✅ **Private keys never transmitted** - Only signatures are sent
- ✅ **Challenge-response authentication** - Prevents replay attacks  
- ✅ **Time-limited challenges** - Challenges expire in 5 minutes
- ✅ **Single-use challenges** - Each challenge can only be used once
- ✅ **ECDSA P-256** - Industry standard elliptic curve cryptography
- ✅ **Account isolation** - Users can only access their own data

---

## TODO - Future Enhancements

- [ ] **Email binding**: Associate email addresses with accounts for easier recovery
- [ ] **Real database**: Replace in-memory storage with SQLite/PostgreSQL
- [ ] **Rate limiting**: Add rate limits to prevent abuse
- [ ] **Logging**: Comprehensive audit logging
- [ ] **Backup/Export**: Allow users to export their sleep data
- [ ] **Data retention**: Configurable data retention policies
- [ ] **Multiple device support**: Better handling of multiple client devices per account

---

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Server runs on http://localhost:3001
```

## Error Codes

- `400` - Bad Request (invalid input data)
- `401` - Unauthorized (authentication failed)
- `404` - Not Found (account/entry not found)
- `500` - Internal Server Error