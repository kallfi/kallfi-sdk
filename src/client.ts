import type {
  GenerationCreateRequest,
  Operation,
  OperationAcceptedResponse,
  SoulAcceptedResponse,
  SoulCreateRequest,
  Soul,
  SoulUpdateAcceptedResponse,
  SoulUpdateRequest,
  SourceAssetAcceptedResponse,
  SourceAssetCreateRequest,
} from "./generated.js";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface KallfiOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
}

export interface MutationOptions {
  idempotencyKey: string;
}

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export class KallfiNetworkError extends Error {
  readonly cause: unknown;
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "KallfiNetworkError";
    this.cause = cause;
  }
}

export class KallfiTimeoutError extends KallfiNetworkError {
  readonly timeoutMs: number;
  constructor(timeoutMs: number, cause?: unknown) {
    super(`Kallfi request timed out after ${timeoutMs}ms`, cause);
    this.name = "KallfiTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class KallfiApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly request_id?: string;
  readonly details?: Readonly<Record<string, string>>;
  readonly retry_after?: string;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    request_id?: string;
    details?: Readonly<Record<string, string>>;
    retry_after?: string;
  }) {
    super(options.message);
    this.name = "KallfiApiError";
    this.status = options.status;
    this.code = options.code;
    this.request_id = options.request_id;
    this.details = options.details;
    this.retry_after = options.retry_after;
  }

  get requestId(): string | undefined { return this.request_id; }
  get retryAfter(): string | undefined { return this.retry_after; }
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function mutationKey(options: MutationOptions | string): string {
  const key = typeof options === "string" ? options : options.idempotencyKey;
  return key?.trim() ? key : "";
}

export class Kallfi {
  readonly sourceAssets: SourceAssetsResource;
  readonly souls: SoulsResource;
  readonly operations: OperationsResource;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: KallfiOptions) {
    if (!options.apiKey?.trim()) throw new TypeError("apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.kallfi.com").replace(/\/+$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new TypeError("A fetch implementation is required");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new TypeError("timeoutMs must be positive");
    this.sourceAssets = new SourceAssetsResource(this);
    this.souls = new SoulsResource(this);
    this.operations = new OperationsResource(this);
  }

  static fromEnv(options: Omit<KallfiOptions, "apiKey"> = {}): Kallfi {
    const apiKey = process.env.KALLFI_API_KEY;
    if (!apiKey) throw new TypeError("KALLFI_API_KEY is required");
    return new Kallfi({ ...options, apiKey });
  }

  async request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const mutation = method !== "GET" && method !== "HEAD";
    if (mutation && !idempotencyKey) throw new TypeError("idempotencyKey is required for mutations");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (mutation) headers["Idempotency-Key"] = idempotencyKey!;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    try {
      let response: Response;
      try {
        response = await this.fetcher(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted) throw new KallfiTimeoutError(this.timeoutMs, error);
        throw new KallfiNetworkError("Kallfi request failed", error);
      }
      if (!response.ok) throw await this.apiError(response);
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      if (!text) return undefined as T;
      try { return JSON.parse(text) as T; }
      catch (error) { throw new KallfiNetworkError("Kallfi returned invalid JSON", error); }
    } finally {
      clearTimeout(timer);
    }
  }

  private async apiError(response: Response): Promise<KallfiApiError> {
    const retry_after = response.headers.get("retry-after") ?? undefined;
    const text = await response.text();
    let payload: any;
    try { payload = text ? JSON.parse(text) : undefined; } catch { payload = undefined; }
    const error = payload?.error;
    return new KallfiApiError({
      status: response.status,
      code: typeof error?.code === "string" ? error.code : "http_error",
      message: typeof error?.message === "string" ? error.message : `Kallfi API request failed (${response.status})`,
      request_id: typeof error?.request_id === "string" ? error.request_id : undefined,
      details: error?.details && typeof error.details === "object" ? error.details : undefined,
      retry_after,
    });
  }
}

export class SourceAssetsResource {
  constructor(private readonly client: Kallfi) {}
  create(body: SourceAssetCreateRequest, options: MutationOptions | string): Promise<SourceAssetAcceptedResponse> {
    return this.client.request("POST", "/v1/soul-source-assets", body, mutationKey(options));
  }
}

export class SoulsResource {
  constructor(private readonly client: Kallfi) {}
  create(body: SoulCreateRequest, options: MutationOptions | string): Promise<SoulAcceptedResponse> {
    return this.client.request("POST", "/v1/souls", body, mutationKey(options));
  }
  retrieve(soulId: string): Promise<Soul> {
    return this.client.request("GET", `/v1/souls/${encoded(soulId)}`);
  }
  update(soulId: string, body: SoulUpdateRequest, options: MutationOptions | string): Promise<SoulUpdateAcceptedResponse> {
    return this.client.request("PATCH", `/v1/souls/${encoded(soulId)}`, body, mutationKey(options));
  }
  createResponse(soulId: string, body: import("./generated.js").ResponseCreateRequest, options: MutationOptions | string): Promise<OperationAcceptedResponse> {
    return this.client.request("POST", `/v1/souls/${encoded(soulId)}/responses`, body, mutationKey(options));
  }
  createGeneration(soulId: string, body: GenerationCreateRequest, options: MutationOptions | string): Promise<OperationAcceptedResponse> {
    return this.client.request("POST", `/v1/souls/${encoded(soulId)}/generations`, body, mutationKey(options));
  }
}

export class OperationsResource {
  constructor(private readonly client: Kallfi) {}
  retrieve(operationId: string): Promise<Operation> {
    return this.client.request("GET", `/v1/operations/${encoded(operationId)}`);
  }

  async wait(operationId: string, options: WaitOptions = {}): Promise<Operation> {
    const timeoutMs = options.timeoutMs ?? 120_000;
    const intervalMs = options.intervalMs ?? 2_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be positive");
    if (!Number.isFinite(intervalMs) || intervalMs < 100 || intervalMs > 30_000) {
      throw new TypeError("intervalMs must be between 100 and 30000");
    }

    const deadline = Date.now() + timeoutMs;
    const terminal = new Set<Operation["status"]>(["succeeded", "failed", "canceled"]);
    for (;;) {
      if (options.signal?.aborted) throw new KallfiNetworkError("Operation wait was aborted", options.signal.reason);
      const operation = await this.retrieve(operationId);
      if (terminal.has(operation.status)) return operation;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new KallfiTimeoutError(timeoutMs);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, Math.min(intervalMs, remaining));
        options.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new KallfiNetworkError("Operation wait was aborted", options.signal?.reason));
        }, { once: true });
      });
    }
  }
}
