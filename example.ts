/**
 * Example usage of the Vegap SDK
 * 
 * This file demonstrates how to use the SDK in your application.
 */

import { init, vegap } from './src/index.js';

// Initialize the SDK once at application startup
init({
  apiKey: 'your-api-key-here',
  companyId: 'your-company-id-here',
  baseUrl: 'https://api.vegap.com', // Optional, defaults to http://localhost:3001
});

// Example 1: Simple GET request with query parameters
async function getUserData(source: string, id: string) {
  // One line. Every API.
  // vegap handles all the mapping automatically ✨
  return await vegap.proxy(`${source}-customers`, { id });
}

// Example 2: Using the result
async function example1() {
  const result = await getUserData('stripe', 'cus_123');
  console.log('User data:', result.data);
}

// Example 3: POST request with body
async function createCustomer() {
  const result = await vegap.proxy('stripe-customers', {
    method: 'POST',
    body: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  });
  console.log('Created customer:', result.data);
}

// Example 4: Request with additional path
async function getSubscriptions() {
  const result = await vegap.proxy('stripe-customers', {
    path: 'cus_123/subscriptions',
    query: { limit: 10 },
  });
  console.log('Subscriptions:', result.data);
}

// Example 5: Transform a raw API response
async function transformResponse() {
  const rawResponse = {
    id: 'cus_123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const result = await vegap.transform({
    mappingId: '507f1f77bcf86cd799439011',
    rawResponse,
  });

  console.log('Transformed:', result.output);
  console.log('Success:', result.success);
}

// Example 6: Using TypeScript types
interface Customer {
  id: string;
  name: string;
  email: string;
}

async function getTypedCustomer(): Promise<Customer> {
  const result = await vegap.proxy<Customer>('stripe-customers', { 
    id: 'cus_123' 
  });
  return result.data;
}

// Run examples (commented out to avoid execution)
// example1();
// createCustomer();
// getSubscriptions();
// transformResponse();
// getTypedCustomer();

