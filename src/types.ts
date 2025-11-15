/**
 * Configuration options for the Vegap SDK
 */
export interface VegapConfig {
  /**
   * Your Vegap API key
   */
  apiKey: string;
  
  /**
   * Base URL of the Vegap API server
   * @default "http://localhost:3001"
   */
  baseUrl?: string;
  
  /**
   * Company ID (optional, will be inferred from API key if not provided)
   */
  companyId?: string;
}

/**
 * Options for proxy requests
 * 
 * If you pass a simple object as the second parameter, it will be treated as:
 * - Query parameters for GET/DELETE requests
 * - Body for POST/PUT/PATCH requests
 * 
 * For more control, use the full ProxyOptions object.
 */
export interface ProxyOptions {
  /**
   * Query parameters to include in the request
   * If not specified and method is GET/DELETE, the options object itself will be used as query params
   */
  query?: Record<string, string | number | boolean | undefined>;
  
  /**
   * Request body (for POST, PUT, PATCH requests)
   * If not specified and method is POST/PUT/PATCH, the options object itself will be used as body
   */
  body?: Record<string, any> | string;
  
  /**
   * HTTP method
   * @default "GET"
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /**
   * Additional path segments to append to the proxy endpoint
   * Example: if customSlug is "stripe-customers" and path is "cus_123", 
   * the request will be made to /api/proxy/custom/:companyId/stripe-customers/cus_123
   */
  path?: string;
  
  /**
   * Additional headers to include in the request
   */
  headers?: Record<string, string>;
}

/**
 * Simplified proxy options - can be a simple object for GET requests
 * or a ProxyOptions object for more control
 */
export type ProxyOptionsInput = 
  | Record<string, string | number | boolean | undefined>
  | ProxyOptions;

/**
 * Options for transform requests
 */
export interface TransformOptions {
  /**
   * The raw API response to transform
   */
  rawResponse: Record<string, any> | string;
  
  /**
   * Mapping ID to use for transformation
   */
  mappingId: string;
}

/**
 * Response from a proxy request
 */
export interface ProxyResponse<T = any> {
  /**
   * The transformed response data
   */
  data: T;
  
  /**
   * Response metadata
   */
  meta?: {
    mapping_id?: string;
    mapping_name?: string;
    execution_time_ms?: number;
    tokens_used?: number;
    ai_cost_usd?: number;
  };
}

/**
 * Response from a transform request
 */
export interface TransformResponse<T = any> {
  /**
   * Whether the transformation was successful
   */
  success: boolean;
  
  /**
   * The transformed output
   */
  output: T;
  
  /**
   * Any errors that occurred during transformation
   */
  errors?: string[];
  
  /**
   * Execution time in milliseconds
   */
  execution_time_ms?: number;
  
  /**
   * Tokens used (if AI transformation was used)
   */
  tokens_used?: number;
  
  /**
   * AI cost in USD (if AI transformation was used)
   */
  ai_cost_usd?: number;
  
  /**
   * Metadata about the mapping used
   */
  meta?: {
    mapping_id?: string;
    mapping_name?: string;
  };
}

/**
 * Error response from the API
 */
export interface VegapError {
  error: string;
  [key: string]: any;
}

