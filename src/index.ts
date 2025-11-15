import type {
  VegapConfig,
  ProxyOptions,
  ProxyOptionsInput,
  TransformOptions,
  ProxyResponse,
  TransformResponse,
  VegapError,
} from './types.js';

/**
 * Vegap SDK Client
 * 
 * @example
 * ```typescript
 * const vegap = new Vegap({ apiKey: 'your-api-key' });
 * 
 * // Proxy request
 * const user = await vegap.proxy('stripe-customers', { id: 'cus_123' });
 * 
 * // Transform response
 * const transformed = await vegap.transform({
 *   mappingId: 'mapping-id',
 *   rawResponse: { /* raw API response *\/ }
 * });
 * ```
 */
export class Vegap {
  private apiKey: string;
  private baseUrl: string;
  private companyId?: string;

  constructor(config: VegapConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:4000';
    this.companyId = config.companyId;
  }

  /**
   * Set the company ID (useful if you want to override the inferred one)
   */
  setCompanyId(companyId: string): void {
    this.companyId = companyId;
  }

  /**
   * Proxy a request through Vegap
   * Automatically handles mapping and transformation
   * 
   * @param customSlug - The custom slug for the mapping (e.g., "stripe-customers")
   * @param options - Request options (query params, body, method, etc.)
   *                  Can be a simple object for GET requests, or ProxyOptions for more control
   * @returns The transformed response
   * 
   * @example
   * ```typescript
   * // GET request with query params (simple object)
   * const user = await vegap.proxy('stripe-customers', { id: 'cus_123' });
   * 
   * // POST request with body
   * const customer = await vegap.proxy('stripe-customers', {
   *   method: 'POST',
   *   body: { name: 'John Doe', email: 'john@example.com' }
   * });
   * 
   * // Request with additional path
   * const subscription = await vegap.proxy('stripe-customers', {
   *   path: 'cus_123/subscriptions',
   *   query: { limit: 10 }
   * });
   * ```
   */
  async proxy<T = any>(
    customSlug: string,
    options: ProxyOptionsInput = {}
  ): Promise<ProxyResponse<T>> {
    // Normalize options - if it's a simple object without method/body/query/path/headers,
    // treat it as query params for GET requests
    let normalizedOptions: ProxyOptions;
    
    if ('method' in options || 'body' in options || 'query' in options || 'path' in options || 'headers' in options) {
      // It's already a ProxyOptions object
      normalizedOptions = options as ProxyOptions;
    } else {
      // It's a simple object - treat as query params for GET
      normalizedOptions = {
        query: options as Record<string, string | number | boolean | undefined>,
        method: 'GET',
      };
    }

    const {
      query = {},
      body,
      method = 'GET',
      path,
      headers = {},
    } = normalizedOptions;

    // Get company ID (will be inferred from API key if not provided)
    const companyId = await this.getCompanyId();

    // Build URL
    let url = `${this.baseUrl}/api/proxy/custom/${companyId}/${customSlug.toLowerCase()}`;
    
    // Append additional path if provided
    if (path) {
      // Remove leading slash from path if present
      const cleanPath = path.replace(/^\//, '');
      url += `/${cleanPath}`;
    }

    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Add body for POST, PUT, PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = typeof body === 'string' 
        ? body 
        : JSON.stringify(body);
    }

    // Make request
    const response = await fetch(url, requestOptions);

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      })) as VegapError;
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse response
    const data = await response.json() as T;
    
    // The response from the proxy endpoint is already the transformed data
    // Return it directly, wrapped in ProxyResponse format
    return {
      data,
    };
  }

  /**
   * Transform a raw API response using a mapping
   * 
   * @param options - Transform options (mappingId and rawResponse)
   * @returns The transformed response
   * 
   * @example
   * ```typescript
   * const transformed = await vegap.transform({
   *   mappingId: '507f1f77bcf86cd799439011',
   *   rawResponse: {
   *     id: 'cus_123',
   *     name: 'John Doe',
   *     email: 'john@example.com'
   *   }
   * });
   * ```
   */
  async transform<T = any>(
    options: TransformOptions
  ): Promise<TransformResponse<T>> {
    const { mappingId, rawResponse } = options;

    if (!mappingId) {
      throw new Error('mappingId is required');
    }

    if (!rawResponse) {
      throw new Error('rawResponse is required');
    }

    // Build URL
    const url = `${this.baseUrl}/api/transform`;

    // Prepare request body
    const requestBody = {
      mapping_id: mappingId,
      raw_response: rawResponse,
    };

    // Make request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      })) as VegapError;
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse response
    const data = await response.json() as TransformResponse<T>;
    
    return data;
  }

  /**
   * Get company ID from API key (cached)
   * This is done by making a test request to get the company ID
   */
  private async getCompanyId(): Promise<string> {
    if (this.companyId) {
      return this.companyId;
    }

    // Try to get company ID from endpoints endpoint
    // This requires a valid API key and will return the company ID implicitly
    // We'll use a simple approach: make a request to get endpoints and extract company ID
    // Actually, we can't easily get company ID from the API without making assumptions
    // So we'll require it to be set or throw an error
    
    // For now, we'll throw an error if company ID is not provided
    // In the future, we could add an endpoint to get company info from API key
    throw new Error(
      'Company ID is required. Please provide it in the config or use setCompanyId() method.'
    );
  }
}

// Global instance (will be initialized by init() or createInstance())
let globalInstance: Vegap | null = null;

/**
 * Initialize the global Vegap instance
 * Call this once at the start of your application
 * 
 * @example
 * ```typescript
 * import { init } from '@vegap/sdk';
 * 
 * init({ apiKey: 'your-api-key', companyId: 'your-company-id' });
 * 
 * // Now you can use vegap.proxy() anywhere
 * ```
 */
export function init(config: VegapConfig): void {
  globalInstance = new Vegap(config);
}

/**
 * Create a new Vegap SDK instance
 * 
 * @example
 * ```typescript
 * import { createInstance } from '@vegap/sdk';
 * 
 * const client = createInstance({ apiKey: 'your-api-key', companyId: 'your-company-id' });
 * ```
 */
export function createInstance(config: VegapConfig): Vegap {
  return new Vegap(config);
}

/**
 * Get the global Vegap instance
 * Throws an error if not initialized
 */
function getInstance(): Vegap {
  if (!globalInstance) {
    throw new Error(
      'Vegap SDK not initialized. Call init() first or use createInstance() to create a new instance.'
    );
  }
  return globalInstance;
}

/**
 * Global vegap object for convenient access
 * Must be initialized with init() first
 * 
 * @example
 * ```typescript
 * import { init, vegap } from '@vegap/sdk';
 * 
 * init({ apiKey: 'your-api-key', companyId: 'your-company-id' });
 * 
 * // One line. Every API.
 * async function getUserData(source: string, id: string) {
 *   return await vegap.proxy(`${source}-customers`, { id });
 * }
 * ```
 */
export const vegap = {
  /**
   * Proxy a request through Vegap
   * Automatically handles mapping and transformation
   * 
   * @example
   * ```typescript
   * // Simple GET request
   * const user = await vegap.proxy('stripe-customers', { id: 'cus_123' });
   * ```
   */
  proxy<T = any>(
    customSlug: string,
    options: ProxyOptionsInput = {}
  ): Promise<ProxyResponse<T>> {
    return getInstance().proxy(customSlug, options);
  },

  /**
   * Transform a raw API response using a mapping
   */
  transform<T = any>(
    options: TransformOptions
  ): Promise<TransformResponse<T>> {
    return getInstance().transform(options);
  },
};

// Default export
export default Vegap;

// Export types
export type {
  VegapConfig,
  ProxyOptions,
  ProxyOptionsInput,
  TransformOptions,
  ProxyResponse,
  TransformResponse,
  VegapError,
};

