# Vegap SDK

**One line. Every API.**

The Vegap SDK makes it easy to interact with any API through Vegap's proxy and transform functionality. All mapping is handled automatically ✨

## Installation

```bash
npm install vegap-sdk
```

## Quick Start

```typescript
import { init, vegap } from 'vegap-sdk';

// Initialize the SDK (once at app startup)
init({
  apiKey: 'your-api-key',
  companyId: 'your-company-id',
  baseUrl: 'https://api.vegap.com' // optional, defaults to http://localhost:3001
});

// One line. Every API.
async function getUserData(source: string, id: string) {
  return await vegap.proxy(`${source}-customers`, { id });
}

// Use it
const user = await getUserData('stripe', 'cus_123');
console.log(user.data); // Transformed response - vegap handles all the mapping automatically ✨
```

## API Reference

### `init(config)`

Initialize the global Vegap SDK instance. Call this once at the start of your application.

**Parameters:**
- `config.apiKey` (required): Your Vegap API key
- `config.companyId` (required): Your company ID
- `config.baseUrl` (optional): Base URL of the Vegap API server (default: `http://localhost:3001`)

**Example:**
```typescript
import { init } from '@vegap/sdk';

init({ apiKey: 'your-api-key', companyId: 'your-company-id' });
```

### `createInstance(config)`

Create a new Vegap SDK instance (alternative to using the global instance).

**Parameters:** Same as `init()`

**Returns:** A `Vegap` instance

**Example:**
```typescript
import { createInstance } from '@vegap/sdk';

const client = createInstance({ apiKey: 'your-api-key', companyId: 'your-company-id' });
```

### `proxy(customSlug, options?)`

Proxy a request through Vegap. Automatically handles mapping and transformation.

**Parameters:**
- `customSlug` (required): The custom slug for the mapping (e.g., `"stripe-customers"`)
- `options` (optional): Request options
  - `query`: Query parameters as an object
  - `body`: Request body (for POST, PUT, PATCH)
  - `method`: HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) - default: `GET`
  - `path`: Additional path segments to append
  - `headers`: Additional headers

**Returns:** `Promise<ProxyResponse<T>>`

**Example:**
```typescript
// GET request with query params
const customer = await client.proxy('stripe-customers', { 
  id: 'cus_123' 
});

// POST request with body
const newCustomer = await client.proxy('stripe-customers', {
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// Request with additional path
const subscriptions = await client.proxy('stripe-customers', {
  path: 'cus_123/subscriptions',
  query: { limit: 10 }
});
```

### `transform(options)`

Transform a raw API response using a mapping.

**Parameters:**
- `options.mappingId` (required): The mapping ID to use
- `options.rawResponse` (required): The raw API response to transform

**Returns:** `Promise<TransformResponse<T>>`

**Example:**
```typescript
const transformed = await client.transform({
  mappingId: '507f1f77bcf86cd799439011',
  rawResponse: {
    id: 'cus_123',
    name: 'John Doe',
    email: 'john@example.com'
  }
});

console.log(transformed.output); // Transformed data
console.log(transformed.success); // true/false
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type { ProxyResponse, TransformResponse } from '@vegap/sdk';

async function getCustomer(): Promise<ProxyResponse<{ id: string; name: string }>> {
  return await client.proxy('stripe-customers', { id: 'cus_123' });
}
```

## Error Handling

The SDK throws errors for failed requests:

```typescript
try {
  const result = await client.proxy('stripe-customers', { id: 'invalid' });
} catch (error) {
  console.error('Request failed:', error.message);
}
```

## License

ISC

