import { KALLFI_OPERATIONS, type KallfiOperationId } from "./operations.js";
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

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type KallfiSurface = "nsfw-disabled" | "nsfw-enabled";
export interface OperationArguments {
  path?: Readonly<Record<string, string>>;
  query?: Readonly<
    Record<
      string,
      string | number | boolean | ReadonlyArray<string | number | boolean>
    >
  >;
  body?: unknown;
}
export type OperationOptions = Pick<
  DetailedRequestOptions,
  "idempotencyKey" | "signal" | "timeoutMs"
>;

export interface DetailedRequestOptions {
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export interface DetailedResponse<T> {
  status: number;
  data: T;
  requestId?: string;
  retryAfter?: string;
  location?: string;
  contentType?: string;
}

export interface KallfiOptions {
  surface?: KallfiSurface;
  workspaceId?: string;
  maxResponseBytes?: number;
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

export class KallfiWorkspaceUnsupportedError extends Error {
  readonly code = "workspace_capability_unsupported" as const;
  constructor() {
    super("The server does not support explicit Account workspace selection");
    this.name = "KallfiWorkspaceUnsupportedError";
  }
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
  readonly outcome?: "mutation_outcome_unknown" | "read_projection_unavailable";
  readonly reconciliationRequired?: boolean;
  readonly automaticRetryAllowed?: boolean;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    request_id?: string;
    details?: Readonly<Record<string, string>>;
    retry_after?: string;
    outcome?: "mutation_outcome_unknown" | "read_projection_unavailable";
    reconciliationRequired?: boolean;
    automaticRetryAllowed?: boolean;
  }) {
    super(options.message);
    this.name = "KallfiApiError";
    this.status = options.status;
    this.code = options.code;
    this.request_id = options.request_id;
    this.details = options.details;
    this.retry_after = options.retry_after;
    this.outcome = options.outcome;
    this.reconciliationRequired = options.reconciliationRequired;
    this.automaticRetryAllowed = options.automaticRetryAllowed;
  }

  get requestId(): string | undefined {
    return this.request_id;
  }
  get retryAfter(): string | undefined {
    return this.retry_after;
  }
}

function rejectTraversal(value: string): void {
  let decoded = value;
  for (let depth = 0; depth < 6; depth++) {
    if (
      decoded
        .split(/[\\/]/)
        .some((segment) => segment === "." || segment === "..")
    )
      throw new TypeError("Dot path segments are not allowed");
    if (!/%[0-9a-f]{2}/i.test(decoded)) return;
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      throw new TypeError("Path encoding is invalid");
    }
    if (next === decoded) return;
    decoded = next;
  }
  throw new TypeError("Nested path encoding is not allowed");
}
function encoded(value: string): string {
  if (typeof value !== "string" || !value || value.length > 2048)
    throw new TypeError("Path identifier is invalid");
  rejectTraversal(value);
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
  private readonly workspaceId?: string;
  private readonly maxResponseBytes: number;

  constructor(options: KallfiOptions) {
    if (!options.apiKey?.trim()) throw new TypeError("apiKey is required");
    this.apiKey = options.apiKey;
    const knownOrigins: Record<string, KallfiSurface> = {
      "https://acr.kallfi.com": "nsfw-disabled",
      "https://acr.kallfi.red": "nsfw-enabled",
      "https://api.kallfi.com": "nsfw-disabled",
      "https://api.kallfi.red": "nsfw-enabled",
    };
    let supplied: URL | undefined;
    if (options.baseUrl !== undefined) {
      try {
        supplied = new URL(options.baseUrl);
      } catch {
        throw new TypeError("baseUrl is invalid");
      }
    }
    const surface =
      options.surface ??
      (supplied ? knownOrigins[supplied.origin] : undefined) ??
      "nsfw-disabled";
    if (surface !== "nsfw-disabled" && surface !== "nsfw-enabled")
      throw new TypeError("surface is invalid");
    const expectedOrigin =
      surface === "nsfw-disabled"
        ? "https://acr.kallfi.com"
        : "https://acr.kallfi.red";
    let base: URL;
    try {
      base = new URL(options.baseUrl ?? expectedOrigin);
    } catch {
      throw new TypeError("baseUrl is invalid");
    }
    if (
      knownOrigins[base.origin] !== surface ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      !["", "/"].includes(base.pathname)
    ) {
      throw new TypeError("baseUrl must match the selected canonical surface");
    }
    this.baseUrl = base.origin;
    if (
      options.workspaceId !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        options.workspaceId,
      )
    ) {
      throw new TypeError("workspaceId must be a UUID");
    }
    this.workspaceId = options.workspaceId;
    this.maxResponseBytes = options.maxResponseBytes ?? 2_097_152;
    if (
      !Number.isSafeInteger(this.maxResponseBytes) ||
      this.maxResponseBytes < 1 ||
      this.maxResponseBytes > 16_777_216
    )
      throw new TypeError("maxResponseBytes must be between 1 and 16777216");
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher)
      throw new TypeError("A fetch implementation is required");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0)
      throw new TypeError("timeoutMs must be positive");
    this.sourceAssets = new SourceAssetsResource(this);
    this.souls = new SoulsResource(this);
    this.operations = new OperationsResource(this);
  }

  static fromEnv(options: Omit<KallfiOptions, "apiKey"> = {}): Kallfi {
    const apiKey = process.env.KALLFI_API_KEY;
    if (!apiKey) throw new TypeError("KALLFI_API_KEY is required");
    return new Kallfi({ ...options, apiKey });
  }

  async operation<T = unknown>(
    operationId: KallfiOperationId,
    args: OperationArguments = {},
    options: OperationOptions = {},
  ): Promise<DetailedResponse<T>> {
    if (!Object.hasOwn(KALLFI_OPERATIONS, operationId))
      throw new TypeError("Unknown operationId");
    const operation = KALLFI_OPERATIONS[operationId];
    if (operation.scope === "account" && this.workspaceId !== undefined)
      throw new TypeError(
        "Account operations do not accept a workspace selector",
      );
    if (
      Object.keys(args).some((key) => !["path", "query", "body"].includes(key))
    )
      throw new TypeError("Unknown operation argument");
    const paths = args.path ?? {};
    const query = args.query ?? {};
    const pathParameters: readonly { name: string; required: boolean }[] =
      operation.pathParameters;
    const queryParameters: readonly {
      name: string;
      required: boolean;
      array: boolean;
    }[] = operation.queryParameters;
    if (
      Object.keys(paths).some(
        (key) => !pathParameters.some((parameter) => parameter.name === key),
      ) ||
      Object.keys(query).some(
        (key) => !queryParameters.some((parameter) => parameter.name === key),
      )
    )
      throw new TypeError("Unknown path or query parameter");
    let path: string = operation.path;
    for (const parameter of pathParameters) {
      const value = paths[parameter.name];
      if (value === undefined) {
        if (parameter.required)
          throw new TypeError("Required path parameter is missing");
        continue;
      }
      path = path.replace(`{${parameter.name}}`, encoded(value));
    }
    if (/\{[^}]+\}/.test(path))
      throw new TypeError("Required path parameter is missing");
    const encodedQuery = new URLSearchParams();
    for (const parameter of queryParameters) {
      const value = query[parameter.name];
      if (value === undefined) {
        if (parameter.required)
          throw new TypeError("Required query parameter is missing");
        continue;
      }
      const values = Array.isArray(value) ? value : [value];
      if (Array.isArray(value) && !parameter.array)
        throw new TypeError("Query parameter is not an array");
      for (const entry of values) {
        if (
          !["string", "number", "boolean"].includes(typeof entry) ||
          (typeof entry === "number" && !Number.isFinite(entry))
        )
          throw new TypeError("Query parameter is invalid");
        encodedQuery.append(parameter.name, String(entry));
      }
    }
    if (operation.bodyRequired && args.body === undefined)
      throw new TypeError("Required request body is missing");
    if (!operation.bodyAllowed && args.body !== undefined)
      throw new TypeError("Operation does not accept a request body");
    const suffix = encodedQuery.toString();
    return this.requestDetailed<T>(
      operation.method,
      suffix ? `${path}?${suffix}` : path,
      {
        body: args.body,
        idempotencyKey: options.idempotencyKey,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
      },
    );
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    return (
      await this.requestDetailed<T>(method, path, { body, idempotencyKey })
    ).data;
  }

  async requestDetailed<T>(
    method: string,
    path: string,
    options: DetailedRequestOptions = {},
  ): Promise<DetailedResponse<T>> {
    if (this.workspaceId === undefined)
      return this.performRequest<T>(method, path, options, "business");
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > 2_147_483_647
    )
      throw new TypeError("timeoutMs is invalid");
    const deadline = Date.now() + timeoutMs;
    await this.requireWorkspaceCapability({
      signal: options.signal,
      timeoutMs,
    });
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new KallfiTimeoutError(timeoutMs);
    try {
      return await this.performRequest<T>(
        method,
        path,
        { ...options, timeoutMs: remaining },
        "business",
      );
    } catch (error) {
      if (error instanceof KallfiTimeoutError)
        throw new KallfiTimeoutError(timeoutMs);
      throw error;
    }
  }

  private async requireWorkspaceCapability(
    options: Pick<DetailedRequestOptions, "signal" | "timeoutMs">,
  ): Promise<void> {
    try {
      const response = await this.performRequest<unknown>(
        "GET",
        "/v1/capabilities",
        options,
        "capability",
      );
      const value = response.data;
      if (
        response.status !== 200 ||
        response.contentType !== "application/json" ||
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      )
        throw new KallfiWorkspaceUnsupportedError();
      const record = value as Record<string, unknown>;
      const fields = [
        "protocolVersion",
        "workspaceSelection",
        "selectorHeader",
        "omittedWorkspace",
        "explicitWorkspaceScopes",
        "accountOperationWorkspace",
      ];
      if (
        Object.keys(record).length !== fields.length ||
        fields.some((key) => !Object.hasOwn(record, key)) ||
        record.protocolVersion !== 1 ||
        record.workspaceSelection !== "account-principal-v1" ||
        record.selectorHeader !== "X-Kallfi-Workspace-ID" ||
        record.omittedWorkspace !== "personal" ||
        record.accountOperationWorkspace !== "personal-only" ||
        !Array.isArray(record.explicitWorkspaceScopes) ||
        record.explicitWorkspaceScopes.length !== 1 ||
        record.explicitWorkspaceScopes[0] !== "organization-runtime"
      )
        throw new KallfiWorkspaceUnsupportedError();
    } catch (error) {
      if (error instanceof KallfiTimeoutError || options.signal?.aborted)
        throw error;
      throw new KallfiWorkspaceUnsupportedError();
    }
  }

  private async performRequest<T>(
    method: string,
    path: string,
    options: DetailedRequestOptions,
    purpose: "business" | "capability",
  ): Promise<DetailedResponse<T>> {
    const verb = method.toUpperCase();
    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(verb))
      throw new TypeError("method is invalid");
    // Resolve only relative API paths: caller cannot redirect credentials or inject a selector header.
    if (
      !path.startsWith("/v1/") ||
      path.startsWith("//") ||
      /[\\#\r\n]/.test(path)
    )
      throw new TypeError("path must be an API path");
    rejectTraversal(path.split("?", 1)[0]!);
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl || !url.pathname.startsWith("/v1/"))
      throw new TypeError("path is invalid");
    const mutation = verb !== "GET" && verb !== "HEAD";
    if (
      mutation &&
      (!options.idempotencyKey?.trim() ||
        options.idempotencyKey.length > 128 ||
        /[\r\n]/.test(options.idempotencyKey))
    )
      throw new TypeError("idempotencyKey is required for mutations");
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    if (
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > 2_147_483_647
    )
      throw new TypeError("timeoutMs is invalid");
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (purpose === "business") headers.Authorization = `Bearer ${this.apiKey}`;
    if (purpose === "business" && this.workspaceId !== undefined)
      headers["X-Kallfi-Workspace-ID"] = this.workspaceId;
    const responseLimit =
      purpose === "capability" ? 4096 : this.maxResponseBytes;
    if (mutation) headers["Idempotency-Key"] = options.idempotencyKey!;
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    const aborted = () =>
      timedOut
        ? new KallfiTimeoutError(timeoutMs)
        : new KallfiNetworkError("Kallfi request was aborted");
    const withAbort = async <R>(pending: Promise<R>): Promise<R> => {
      // Always attach Promise.race handlers, even if custom fetch synchronously aborted.
      let rejectAbort: (() => void) | undefined;
      const cancellation = new Promise<never>((_resolve, reject) => {
        rejectAbort = () => reject(aborted());
        controller.signal.addEventListener("abort", rejectAbort, {
          once: true,
        });
        if (controller.signal.aborted) rejectAbort();
      });
      try {
        return await Promise.race([pending, cancellation]);
      } finally {
        if (rejectAbort)
          controller.signal.removeEventListener("abort", rejectAbort);
      }
    };
    try {
      if (controller.signal.aborted) throw aborted();
      const response = await withAbort(
        this.fetcher(url.toString(), {
          method: verb,
          headers,
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
          signal: controller.signal,
          redirect: "manual",
          cache: "no-store",
        }),
      );
      const token = (value: string | null) =>
        value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
      const requestId = token(response.headers.get("x-request-id"));
      const retryRaw = response.headers.get("retry-after");
      const retryAfter =
        retryRaw &&
        (/^\d{1,10}$/.test(retryRaw) ||
          (/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(
            retryRaw,
          ) &&
            Number.isFinite(Date.parse(retryRaw))))
          ? retryRaw
          : undefined;
      const contentType = response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      let location: string | undefined;
      const rawLocation = response.headers.get("location");
      if (rawLocation && rawLocation.length <= 2048) {
        try {
          const target = new URL(rawLocation, this.baseUrl);
          if (
            target.origin === this.baseUrl &&
            target.pathname.startsWith("/v1/") &&
            !target.search &&
            !target.hash &&
            !target.username &&
            !target.password
          )
            location = target.toString();
        } catch {
          /* no untrusted metadata */
        }
      }
      const fail = (code: string) =>
        new KallfiApiError({
          status: response.status,
          code,
          message: `Kallfi API request failed (${response.status})`,
          request_id: requestId,
          retry_after: retryAfter,
        });
      if (response.status >= 300 && response.status <= 399) {
        void response.body?.cancel().catch(() => undefined);
        throw fail("redirect_rejected");
      }
      if (response.status === 204 || verb === "HEAD") {
        void response.body?.cancel().catch(() => undefined);
        if (!response.ok) throw fail("http_error");
        return {
          status: response.status,
          data: undefined as T,
          requestId,
          retryAfter,
          location,
          contentType,
        };
      }
      if (
        contentType !== "application/json" &&
        !contentType?.endsWith("+json")
      ) {
        void response.body?.cancel().catch(() => undefined);
        throw fail("non_json_response");
      }
      const declared = response.headers.get("content-length");
      if (
        declared &&
        /^\d+$/.test(declared) &&
        Number(declared) > responseLimit
      ) {
        void response.body?.cancel().catch(() => undefined);
        throw fail("response_too_large");
      }
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (reader) {
        try {
          for (;;) {
            const part = await withAbort(reader.read());
            if (part.done) break;
            bytes += part.value.byteLength;
            if (bytes > responseLimit) {
              void reader.cancel().catch(() => undefined);
              throw fail("response_too_large");
            }
            chunks.push(part.value);
          }
        } finally {
          if (controller.signal.aborted)
            void reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
      }
      const responseBytes = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {
        responseBytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let payload: unknown;
      try {
        payload = bytes
          ? JSON.parse(
              new TextDecoder("utf-8", { fatal: true }).decode(responseBytes),
            )
          : undefined;
      } catch {
        throw fail("invalid_json_response");
      }
      if (!response.ok) {
        const envelope =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error: unknown }).error
            : undefined;
        const value =
          envelope && typeof envelope === "object"
            ? (envelope as Record<string, unknown>)
            : undefined;
        const root =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : undefined;
        const safeErrorCode = (candidate: unknown): string | undefined =>
          typeof candidate === "string" &&
          /^[a-z][a-z0-9_]{0,95}$/.test(candidate) &&
          !candidate.includes(this.apiKey)
            ? candidate
            : undefined;
        // Nested canonical envelopes retain precedence; never expose human prose/details.
        const code =
          safeErrorCode(value?.code) ??
          safeErrorCode(root?.code) ??
          safeErrorCode(envelope) ??
          "http_error";
        const id =
          typeof value?.request_id === "string"
            ? token(value.request_id)
            : requestId;
        const outcomeValue = value?.outcome ?? root?.outcome;
        const outcome =
          outcomeValue === "mutation_outcome_unknown" ||
          outcomeValue === "read_projection_unavailable"
            ? outcomeValue
            : undefined;
        const reconciliation =
          value?.reconciliationRequired ?? root?.reconciliationRequired;
        const retry =
          value?.automaticRetryAllowed ?? root?.automaticRetryAllowed;
        throw new KallfiApiError({
          status: response.status,
          code,
          message: `Kallfi API request failed (${response.status})`,
          request_id: id,
          retry_after: retryAfter,
          outcome,
          reconciliationRequired:
            typeof reconciliation === "boolean" ? reconciliation : undefined,
          automaticRetryAllowed: typeof retry === "boolean" ? retry : undefined,
        });
      }
      return {
        status: response.status,
        data: payload as T,
        requestId,
        retryAfter,
        location,
        contentType,
      };
    } catch (error) {
      if (
        error instanceof KallfiApiError ||
        error instanceof KallfiNetworkError
      )
        throw error;
      if (controller.signal.aborted) throw aborted();
      throw new KallfiNetworkError("Kallfi request failed");
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}

export class SourceAssetsResource {
  constructor(private readonly client: Kallfi) {}
  create(
    body: SourceAssetCreateRequest,
    options: MutationOptions | string,
  ): Promise<SourceAssetAcceptedResponse> {
    return this.client.request(
      "POST",
      "/v1/soul-source-assets",
      body,
      mutationKey(options),
    );
  }
}

export class SoulsResource {
  constructor(private readonly client: Kallfi) {}
  create(
    body: SoulCreateRequest,
    options: MutationOptions | string,
  ): Promise<SoulAcceptedResponse> {
    return this.client.request("POST", "/v1/souls", body, mutationKey(options));
  }
  retrieve(soulId: string): Promise<Soul> {
    return this.client.request("GET", `/v1/souls/${encoded(soulId)}`);
  }
  update(
    soulId: string,
    body: SoulUpdateRequest,
    options: MutationOptions | string,
  ): Promise<SoulUpdateAcceptedResponse> {
    return this.client.request(
      "PATCH",
      `/v1/souls/${encoded(soulId)}`,
      body,
      mutationKey(options),
    );
  }
  createResponse(
    soulId: string,
    body: import("./generated.js").ResponseCreateRequest,
    options: MutationOptions | string,
  ): Promise<OperationAcceptedResponse> {
    return this.client.request(
      "POST",
      `/v1/souls/${encoded(soulId)}/responses`,
      body,
      mutationKey(options),
    );
  }
  createGeneration(
    soulId: string,
    body: GenerationCreateRequest,
    options: MutationOptions | string,
  ): Promise<OperationAcceptedResponse> {
    return this.client.request(
      "POST",
      `/v1/souls/${encoded(soulId)}/generations`,
      body,
      mutationKey(options),
    );
  }
}

export class OperationsResource {
  constructor(private readonly client: Kallfi) {}
  retrieve(operationId: string): Promise<Operation> {
    return this.client.request("GET", `/v1/operations/${encoded(operationId)}`);
  }

  async wait(
    operationId: string,
    options: WaitOptions = {},
  ): Promise<Operation> {
    const timeoutMs = options.timeoutMs ?? 120_000;
    const intervalMs = options.intervalMs ?? 2_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      throw new TypeError("timeoutMs must be positive");
    if (
      !Number.isFinite(intervalMs) ||
      intervalMs < 100 ||
      intervalMs > 30_000
    ) {
      throw new TypeError("intervalMs must be between 100 and 30000");
    }

    const deadline = Date.now() + timeoutMs;
    const terminal = new Set<Operation["status"]>([
      "succeeded",
      "failed",
      "canceled",
    ]);
    for (;;) {
      if (options.signal?.aborted)
        throw new KallfiNetworkError("Operation wait was aborted");
      const budget = deadline - Date.now();
      if (budget <= 0) throw new KallfiTimeoutError(timeoutMs);
      let operation: Operation;
      try {
        operation = (
          await this.client.requestDetailed<Operation>(
            "GET",
            `/v1/operations/${encoded(operationId)}`,
            { signal: options.signal, timeoutMs: budget },
          )
        ).data;
      } catch (error) {
        if (error instanceof KallfiTimeoutError)
          throw new KallfiTimeoutError(timeoutMs);
        throw error;
      }
      if (Date.now() >= deadline) throw new KallfiTimeoutError(timeoutMs);
      if (terminal.has(operation.status)) return operation;
      const remaining = deadline - Date.now();
      await new Promise<void>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout>;
        const cleanup = () =>
          options.signal?.removeEventListener("abort", onAbort);
        const onAbort = () => {
          clearTimeout(timer);
          cleanup();
          reject(new KallfiNetworkError("Operation wait was aborted"));
        };
        timer = setTimeout(
          () => {
            cleanup();
            resolve();
          },
          Math.min(intervalMs, remaining),
        );
        options.signal?.addEventListener("abort", onAbort, { once: true });
        if (options.signal?.aborted) onAbort();
      });
    }
  }
}
