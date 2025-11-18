import type {
  VegapConfig,
  ProxyOptions,
  ProxyOptionsInput,
  TransformOptions,
  ProxyResponse,
  TransformResponse,
  PipelineOptions,
  PipelineResponse,
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
    this.baseUrl = config.baseUrl || 'https://api.vegap.de';
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
   * @param identifier - Either a custom slug (string) or options object with mappingId
   * @param options - Request options (query params, body, method, etc.)
   *                  Can be a simple object for GET requests, or ProxyOptions for more control
   * @returns The transformed response
   * 
   * @example
   * ```typescript
   * // Using custom slug (GET request with query params)
   * const user = await vegap.proxy('stripe-customers', { id: 'cus_123' });
   * 
   * // Using custom slug (POST request with body)
   * const customer = await vegap.proxy('stripe-customers', {
   *   method: 'POST',
   *   body: { name: 'John Doe', email: 'john@example.com' }
   * });
   * 
   * // Using mapping ID
   * const data = await vegap.proxy({
   *   mappingId: '507f1f77bcf86cd799439011',
   *   query: { id: 'cus_123' }
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
    identifier: string | ProxyOptionsInput,
    options?: ProxyOptionsInput
  ): Promise<ProxyResponse<T>> {
    // Determine if first parameter is a custom slug or options object
    let customSlug: string | undefined;
    let normalizedOptions: ProxyOptions;

    if (typeof identifier === 'string') {
      // First parameter is a custom slug
      customSlug = identifier;
      
      // Normalize options - if it's a simple object without method/body/query/path/headers,
      // treat it as query params for GET requests
      if (!options) {
        normalizedOptions = { method: 'GET' };
      } else if ('method' in options || 'body' in options || 'query' in options || 'path' in options || 'headers' in options || 'mappingId' in options) {
        // It's already a ProxyOptions object
        normalizedOptions = options as ProxyOptions;
      } else {
        // It's a simple object - treat as query params for GET
        normalizedOptions = {
          query: options as Record<string, string | number | boolean | undefined>,
          method: 'GET',
        };
      }
    } else {
      // First parameter is options object (must contain mappingId)
      normalizedOptions = identifier as ProxyOptions;
      if (!normalizedOptions.mappingId) {
        throw new Error('If first parameter is an options object, it must contain mappingId');
      }
    }

    const {
      query = {},
      body,
      method = 'GET',
      path,
      headers = {},
      mappingId,
    } = normalizedOptions;

    // Build URL based on whether we're using custom slug or mapping ID
    let url: string;
    
    if (mappingId) {
      // Use mapping ID route: /api/proxy/:mappingid
      url = `${this.baseUrl}/api/proxy/${mappingId}`;
      
      // Append additional path if provided
      if (path) {
        const cleanPath = path.replace(/^\//, '');
        url += `/${cleanPath}`;
      }
    } else if (customSlug) {
      // Use custom slug route: /api/proxy/custom/:companyId/:customSlug
      const companyId = await this.getCompanyId();
      url = `${this.baseUrl}/api/proxy/custom/${companyId}/${customSlug.toLowerCase()}`;
      
      // Append additional path if provided
      if (path) {
        const cleanPath = path.replace(/^\//, '');
        url += `/${cleanPath}`;
      }
    } else {
      throw new Error('Either customSlug (string) or mappingId (in options) must be provided');
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
   * Execute a processing pipeline with file or data
   * 
   * @param identifier - Either a custom slug (string) or options object with pipelineId
   * @param options - Pipeline execution options (file, data, headers)
   * @returns The pipeline execution result
   * 
   * @example
   * ```typescript
   * // Using custom slug with file upload
   * const result = await vegap.pipeline('invoice-processor', {
   *   file: fileInput.files[0]
   * });
   * 
   * // Using custom slug with JSON data
   * const result = await vegap.pipeline('invoice-processor', {
   *   data: { invoice_number: 'INV-123', amount: 1000 }
   * });
   * 
   * // Using pipeline ID
   * const result = await vegap.pipeline({
   *   pipelineId: '691b353fc86e42ea8b569c8c',
   *   file: fileInput.files[0]
   * });
   * ```
   */
  async pipeline<T = any>(
    identifier: string | PipelineOptions,
    options?: PipelineOptions
  ): Promise<PipelineResponse<T>> {
    // Determine if first parameter is a custom slug or options object
    let customSlug: string | undefined;
    let normalizedOptions: PipelineOptions;

    if (typeof identifier === 'string') {
      // First parameter is a custom slug
      customSlug = identifier;
      normalizedOptions = options || {};
    } else {
      // First parameter is options object (must contain pipelineId or we'll use custom slug)
      normalizedOptions = identifier;
      if (!normalizedOptions.pipelineId && !customSlug) {
        throw new Error('If first parameter is an options object, it must contain pipelineId, or use custom slug as first parameter');
      }
    }

    const {
      file,
      data,
      headers = {},
      pipelineId,
    } = normalizedOptions;

    // Validate that either file or data is provided
    if (!file && !data) {
      throw new Error('Either file or data must be provided');
    }

    // Build URL based on whether we're using pipeline ID or custom slug
    let url: string;
    
    if (pipelineId) {
      // Use pipeline ID route: /api/pipelines/execute/:pipelineId
      url = `${this.baseUrl}/api/pipelines/execute/${pipelineId}`;
    } else if (customSlug) {
      // Use custom slug route: /api/pipelines/custom/:companyId/:slug
      const companyId = await this.getCompanyId();
      url = `${this.baseUrl}/api/pipelines/custom/${companyId}/${customSlug.toLowerCase()}`;
    } else {
      throw new Error('Either customSlug (string) or pipelineId (in options) must be provided');
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        ...headers,
      },
    };

    // Handle file upload or JSON data
    if (file) {
      // File upload - use FormData
      const formData = new FormData();
      
      // Handle different file types
      if (file instanceof File || file instanceof Blob) {
        formData.append('file', file);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(file)) {
        // Node.js Buffer - convert to Blob for browser compatibility
        const blob = new Blob([file]);
        formData.append('file', blob);
      } else if (file instanceof Uint8Array || (file as any).constructor?.name === 'Buffer') {
        // Handle Buffer-like objects
        const blob = new Blob([file as any]);
        formData.append('file', blob);
      } else {
        throw new Error('Unsupported file type. Use File, Blob, or Buffer.');
      }
      
      // Don't set Content-Type header - browser will set it with boundary
      requestOptions.body = formData;
    } else if (data) {
      // JSON data
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Type': 'application/json',
      };
      requestOptions.body = JSON.stringify({ data });
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

    // Handle CSV response (for CSV output format)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      const csvText = await response.text();
      return {
        success: true,
        job_id: '',
        result: csvText as any,
        status: 'completed',
      };
    }

    // Parse JSON response
    const result = await response.json() as PipelineResponse<T>;
    
    return result;
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
 * import { init } from 'vegap-sdk';
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
 * import { createInstance } from 'vegap-sdk';
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
 * import { init, vegap } from 'vegap-sdk';
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
   * // Using custom slug
   * const user = await vegap.proxy('stripe-customers', { id: 'cus_123' });
   * 
   * // Using mapping ID
   * const data = await vegap.proxy({
   *   mappingId: '507f1f77bcf86cd799439011',
   *   query: { id: 'cus_123' }
   * });
   * ```
   */
  proxy<T = any>(
    identifier: string | ProxyOptionsInput,
    options?: ProxyOptionsInput
  ): Promise<ProxyResponse<T>> {
    return getInstance().proxy(identifier, options);
  },

  /**
   * Transform a raw API response using a mapping
   */
  transform<T = any>(
    options: TransformOptions
  ): Promise<TransformResponse<T>> {
    return getInstance().transform(options);
  },

  /**
   * Execute a processing pipeline with file or data
   * 
   * @example
   * ```typescript
   * // Using custom slug with file upload
   * const result = await vegap.pipeline('invoice-processor', {
   *   file: fileInput.files[0]
   * });
   * 
   * // Using custom slug with JSON data
   * const result = await vegap.pipeline('invoice-processor', {
   *   data: { invoice_number: 'INV-123', amount: 1000 }
   * });
   * 
   * // Using pipeline ID
   * const result = await vegap.pipeline({
   *   pipelineId: '691b353fc86e42ea8b569c8c',
   *   file: fileInput.files[0]
   * });
   * ```
   */
  pipeline<T = any>(
    identifier: string | PipelineOptions,
    options?: PipelineOptions
  ): Promise<PipelineResponse<T>> {
    return getInstance().pipeline(identifier, options);
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
  PipelineOptions,
  PipelineResponse,
  VegapError,
};

