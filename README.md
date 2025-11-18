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
  baseUrl: 'https://api.vegap.de' // optional, defaults to https://api.vegap.de
});

// One line. Every API.
// Using custom slug
async function getUserData(source: string, id: string) {
  return await vegap.proxy(`${source}-customers`, { id });
}

// Using mapping ID
async function getDataByMappingId(mappingId: string, query: Record<string, any>) {
  return await vegap.proxy({
    mappingId,
    query
  });
}

// Use it
const user = await getUserData('stripe', 'cus_123');
console.log(user.data); // Transformed response - vegap handles all the mapping automatically ✨

// Execute a pipeline with file upload
const result = await vegap.pipeline('invoice-processor', {
  file: fileInput.files[0]
});
console.log(result.result); // Processed output
```

## API Reference

### `init(config)`

Initialize the global Vegap SDK instance. Call this once at the start of your application.

**Parameters:**
- `config.apiKey` (required): Your Vegap API key
- `config.companyId` (required): Your company ID
- `config.baseUrl` (optional): Base URL of the Vegap API server (default: `https://api.vegap.de`)

**Example:**
```typescript
import { init } from 'vegap-sdk';

init({ apiKey: 'your-api-key', companyId: 'your-company-id' });
```

### `createInstance(config)`

Create a new Vegap SDK instance (alternative to using the global instance).

**Parameters:** Same as `init()`

**Returns:** A `Vegap` instance

**Example:**
```typescript
import { createInstance } from 'vegap-sdk';

const client = createInstance({ apiKey: 'your-api-key', companyId: 'your-company-id' });
```

### `proxy(identifier, options?)`

Proxy a request through Vegap. Automatically handles mapping and transformation.

The proxy function supports two ways to identify a mapping:

1. **Custom Slug** (recommended for readability): A human-readable identifier like `"stripe-customers"`
2. **Mapping ID**: A MongoDB ObjectId like `"69149d3abad025e96de1fa0d"`

**Parameters:**

**Option 1: Using Custom Slug**
- `identifier` (string, required): The custom slug for the mapping (e.g., `"stripe-customers"`)
- `options` (optional): Request options
  - `query`: Query parameters as an object (or pass a simple object directly for GET requests)
  - `body`: Request body (for POST, PUT, PATCH requests)
  - `method`: HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) - default: `GET`
  - `path`: Additional path segments to append to the endpoint
  - `headers`: Additional headers to include

**Option 2: Using Mapping ID**
- `identifier` (object, required): Options object containing:
  - `mappingId` (string, required): The mapping ID (MongoDB ObjectId)
  - `query`: Query parameters as an object
  - `body`: Request body (for POST, PUT, PATCH requests)
  - `method`: HTTP method - default: `GET`
  - `path`: Additional path segments to append
  - `headers`: Additional headers

**Returns:** `Promise<ProxyResponse<T>>`

**Examples:**

```typescript
// ============================================
// Using Custom Slug (Recommended)
// ============================================

// Simple GET request with query params
// The second parameter can be a simple object (treated as query params)
const customer = await vegap.proxy('stripe-customers', { 
  id: 'cus_123' 
});

// GET request with explicit query option
const customer2 = await vegap.proxy('stripe-customers', {
  method: 'GET',
  query: { id: 'cus_123', limit: 10 }
});

// POST request with body
const newCustomer = await vegap.proxy('stripe-customers', {
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// Request with additional path segments
// This appends to the endpoint: /api/proxy/custom/:companyId/stripe-customers/cus_123/subscriptions
const subscriptions = await vegap.proxy('stripe-customers', {
  path: 'cus_123/subscriptions',
  query: { limit: 10 }
});

// ============================================
// Using Mapping ID
// ============================================

// GET request with mapping ID
const data = await vegap.proxy({
  mappingId: '69149d3abad025e96de1fa0d',
  method: 'GET',
  query: { isin: 'IE00B3RBWM25' }
});

// POST request with mapping ID
const result = await vegap.proxy({
  mappingId: '69149d3abad025e96de1fa0d',
  method: 'POST',
  body: { name: 'Test', value: 123 }
});

// Mapping ID with additional path
const nested = await vegap.proxy({
  mappingId: '69149d3abad025e96de1fa0d',
  path: 'sub/path',
  query: { filter: 'active' }
});
```

**When to use which?**

- **Custom Slug**: Use when you have a readable identifier set up in your Vegap dashboard. Easier to read and maintain.
- **Mapping ID**: Use when you only have the MongoDB ObjectId, or when you're dynamically working with mappings.

### `transform(options)`

Transform a raw API response using a mapping. This is useful when you've already fetched data from an external API and want to transform it using Vegap's mapping rules.

**Parameters:**
- `options.mappingId` (string, required): The mapping ID to use for transformation
- `options.rawResponse` (object | string, required): The raw API response to transform. Can be an object or a JSON string.

**Returns:** `Promise<TransformResponse<T>>`

**Response Structure:**
```typescript
{
  success: boolean;           // Whether transformation was successful
  output: T;                  // The transformed data
  errors?: string[];          // Any errors that occurred
  execution_time_ms?: number; // Time taken to transform
  tokens_used?: number;       // AI tokens used (if AI transformation)
  ai_cost_usd?: number;       // AI cost in USD (if AI transformation)
  meta?: {
    mapping_id?: string;
    mapping_name?: string;
  };
}
```

**Example:**
```typescript
// Transform a raw API response
const rawData = {
  id: 'cus_123',
  name: 'John Doe',
  email: 'john@example.com',
  created: 1234567890
};

const transformed = await vegap.transform({
  mappingId: '69149d3abad025e96de1fa0d',
  rawResponse: rawData
});

if (transformed.success) {
  console.log('Transformed data:', transformed.output);
} else {
  console.error('Transformation errors:', transformed.errors);
}

// Transform from JSON string
const jsonString = '{"id": "123", "name": "Test"}';
const transformed2 = await vegap.transform({
  mappingId: '69149d3abad025e96de1fa0d',
  rawResponse: jsonString
});
```

### `pipeline(identifier, options?)`

Execute a processing pipeline with file upload or JSON data. Pipelines process files through a sequence of AI agents.

**Parameters:**

**Option 1: Using Custom Slug**
- `identifier` (string, required): The custom slug for the pipeline (e.g., `"invoice-processor"`)
- `options` (required): Pipeline execution options
  - `file`: File to upload (File, Blob, or Buffer)
  - `data`: JSON data to send (alternative to file)
  - `headers`: Additional headers to include

**Option 2: Using Pipeline ID**
- `identifier` (object, required): Options object containing:
  - `pipelineId` (string, required): The pipeline ID (MongoDB ObjectId)
  - `file`: File to upload (File, Blob, or Buffer)
  - `data`: JSON data to send (alternative to file)
  - `headers`: Additional headers to include

**Returns:** `Promise<PipelineResponse<T>>`

**Response Structure:**
```typescript
{
  success: boolean;           // Whether execution was successful
  job_id: string;             // The job ID for this execution
  result?: T;                 // The processed output (for JSON output format)
  status: string;             // Processing status
  processing_time_ms?: number; // Processing time in milliseconds
  message?: string;           // Message (for webhook output format)
}
```

**Examples:**

```typescript
// ============================================
// Using Custom Slug (Recommended)
// ============================================

// Execute pipeline with file upload
const result = await vegap.pipeline('invoice-processor', {
  file: fileInput.files[0]
});

// Execute pipeline with JSON data
const result2 = await vegap.pipeline('invoice-processor', {
  data: {
    invoice_number: 'INV-123',
    amount: 1000,
    date: '2024-01-01'
  }
});

// ============================================
// Using Pipeline ID
// ============================================

// Execute pipeline with file upload using pipeline ID
const result3 = await vegap.pipeline({
  pipelineId: '691b353fc86e42ea8b569c8c',
  file: fileInput.files[0]
});

// Execute pipeline with JSON data using pipeline ID
const result4 = await vegap.pipeline({
  pipelineId: '691b353fc86e42ea8b569c8c',
  data: { invoice_number: 'INV-123', amount: 1000 }
});
```

**When to use which?**

- **Custom Slug**: Use when you have a readable identifier set up in your Vegap dashboard. Easier to read and maintain.
- **Pipeline ID**: Use when you only have the MongoDB ObjectId, or when you're dynamically working with pipelines.

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type { ProxyResponse, TransformResponse, PipelineResponse } from 'vegap-sdk';

// Typed proxy response
interface Customer {
  id: string;
  name: string;
  email: string;
}

async function getCustomer(): Promise<ProxyResponse<Customer>> {
  return await vegap.proxy<Customer>('stripe-customers', { id: 'cus_123' });
}

// Typed transform response
interface TransformedData {
  customerId: string;
  fullName: string;
}

async function transformData(): Promise<TransformResponse<TransformedData>> {
  return await vegap.transform<TransformedData>({
    mappingId: '69149d3abad025e96de1fa0d',
    rawResponse: { id: '123', name: 'John' }
  });
}
```

## Error Handling

The SDK throws errors for failed requests. Always wrap API calls in try-catch blocks:

```typescript
try {
  // Using custom slug
  const result = await vegap.proxy('stripe-customers', { id: 'cus_123' });
  console.log('Success:', result.data);
} catch (error) {
  console.error('Request failed:', error.message);
  // Handle error (e.g., show user message, retry, etc.)
}

try {
  // Using mapping ID
  const result = await vegap.proxy({
    mappingId: '69149d3abad025e96de1fa0d',
    query: { isin: 'IE00B3RBWM25' }
  });
  console.log('Success:', result.data);
} catch (error) {
  console.error('Request failed:', error.message);
}

try {
  // Transform
  const result = await vegap.transform({
    mappingId: '69149d3abad025e96de1fa0d',
    rawResponse: { /* data */ }
  });
  
  if (!result.success) {
    console.error('Transformation failed:', result.errors);
  }
} catch (error) {
  console.error('Transform request failed:', error.message);
}
```

**Common Errors:**
- `API key is required`: SDK not initialized or API key missing
- `Company ID is required`: Company ID not provided in config
- `Mapping not found`: Invalid custom slug or mapping ID
- `HTTP 401`: Invalid API key
- `HTTP 403`: Access denied or quota exceeded
- `HTTP 404`: Endpoint not found

## License

ISC

