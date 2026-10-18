from __future__ import annotations

import asyncio
import json
import math
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional, Type, TypeVar, Union
from urllib.parse import quote, urlparse
from uuid import RFC_4122, UUID

import httpx
from pydantic import BaseModel, RootModel

from . import models

ModelT = TypeVar("ModelT", bound=BaseModel)
Identifier = Union[str, RootModel[Any]]


class KallfiError(Exception):
    """Base SDK error."""


class KallfiTransportError(KallfiError):
    """The API response could not be transported or decoded."""


class KallfiTimeoutError(KallfiTransportError):
    """The request exceeded the configured timeout."""


class WorkspaceUnsupportedError(KallfiError):
    """No operation was dispatched because workspace support was not proven."""

    code = "workspace_capability_unsupported"


_WORKSPACE_CAPABILITY = {
    "protocolVersion": 1,
    "workspaceSelection": "account-principal-v1",
    "selectorHeader": "X-Kallfi-Workspace-ID",
    "omittedWorkspace": "personal",
    "explicitWorkspaceScopes": ["organization-runtime"],
    "accountOperationWorkspace": "personal-only",
}


def _check_workspace_capability(response: httpx.Response, content: bytes) -> None:
    try:
        payload = json.loads(content)
        valid = (
            isinstance(payload, dict)
            and type(payload.get("protocolVersion")) is int
            and response.status_code == 200
            and response.headers.get("content-type", "").split(";")[0].strip().lower()
            == "application/json"
            and payload == _WORKSPACE_CAPABILITY
        )
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise WorkspaceUnsupportedError("The server does not support safe workspace selection")


def _capability_request(client: Any, timeout: float) -> httpx.Request:
    # A bare request avoids inherited API authorization, workspace and cookie headers.
    return httpx.Request(
        "GET",
        client.base_url.join("/v1/capabilities"),
        headers={"Accept": "application/json", "Cache-Control": "no-cache, no-store"},
        extensions={"timeout": httpx.Timeout(timeout).as_dict()},
    )


def _workspace_preflight(client: httpx.Client, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    try:
        response = client.send(
            _capability_request(client, timeout), stream=True, auth=None, follow_redirects=False
        )
        try:
            content = bytearray()
            for chunk in response.iter_bytes():
                _check_deadline(deadline)
                if len(content) + len(chunk) > 4096:
                    raise WorkspaceUnsupportedError("Workspace capability response is too large")
                content.extend(chunk)
            _check_deadline(deadline)
            _check_workspace_capability(response, bytes(content))
        finally:
            response.close()
    except httpx.HTTPError as error:
        raise WorkspaceUnsupportedError("Workspace capability discovery failed") from error


async def _async_workspace_preflight(client: httpx.AsyncClient, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    try:
        response = await client.send(
            _capability_request(client, timeout), stream=True, auth=None, follow_redirects=False
        )
        try:
            content = bytearray()
            async for chunk in response.aiter_bytes():
                _check_deadline(deadline)
                if len(content) + len(chunk) > 4096:
                    raise WorkspaceUnsupportedError("Workspace capability response is too large")
                content.extend(chunk)
            _check_deadline(deadline)
            _check_workspace_capability(response, bytes(content))
        finally:
            await response.aclose()
    except httpx.HTTPError as error:
        raise WorkspaceUnsupportedError("Workspace capability discovery failed") from error


def _check_deadline(deadline: float) -> None:
    if time.monotonic() >= deadline:
        raise KallfiTimeoutError("Kallfi request exceeded its overall timeout budget")


class KallfiAPIError(KallfiError):
    def __init__(
        self,
        *,
        status: int,
        code: str,
        message: str,
        request_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        retry_after: Optional[str] = None,
        location: Optional[str] = None,
        content_type: Optional[str] = None,
        outcome: Optional[str] = None,
        reconciliation_required: Optional[bool] = None,
        automatic_retry_allowed: Optional[bool] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id
        self.details = details
        self.retry_after = retry_after
        self.location = location
        self.content_type = content_type
        self.outcome = outcome
        self.reconciliation_required = reconciliation_required
        self.automatic_retry_allowed = automatic_retry_allowed


def _identifier(value: Identifier) -> str:
    raw = value.root if isinstance(value, RootModel) else value
    if str(raw) in {".", ".."}:
        raise ValueError("path identifiers cannot be dot segments")
    return quote(str(raw), safe="")


def _idempotency_headers(idempotency_key: str) -> dict[str, str]:
    if not idempotency_key or not idempotency_key.strip() or len(idempotency_key) > 128:
        raise ValueError("idempotency_key must contain 1 to 128 characters")
    return {"Idempotency-Key": idempotency_key}


def _api_error(response: httpx.Response) -> KallfiAPIError:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    root = payload if isinstance(payload, dict) else {}
    envelope = root.get("error")
    nested = envelope if isinstance(envelope, dict) else {}
    try:
        authorization = response.request.headers.get("authorization", "")
    except RuntimeError:
        authorization = ""
    api_key = authorization.removeprefix("Bearer ") if authorization.startswith("Bearer ") else ""

    def finite_code(candidate: Any) -> Optional[str]:
        if (isinstance(candidate, str) and re.fullmatch(r"[a-z][a-z0-9_]{0,95}", candidate)
                and not (api_key and api_key in candidate)):
            return candidate
        return None

    def nested_first(name: str) -> Any:
        value = nested.get(name)
        return root.get(name) if value is None else value

    code = (finite_code(nested.get("code")) or finite_code(root.get("code"))
            or finite_code(envelope) or "http_error")
    outcome = nested_first("outcome")
    if outcome not in ("mutation_outcome_unknown", "read_projection_unavailable"):
        outcome = None
    reconciliation = nested_first("reconciliationRequired")
    retry = nested_first("automaticRetryAllowed")
    request_id = nested.get("request_id")
    if not isinstance(request_id, str):
        request_id = response.headers.get("x-request-id")
    if (not isinstance(request_id, str) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,128}", request_id)
            or (api_key and api_key in request_id)):
        request_id = None
    return KallfiAPIError(
        status=response.status_code,
        code=code,
        message=f"Kallfi API request failed ({response.status_code})",
        request_id=request_id,
        details=None,
        retry_after=response.headers.get("retry-after"),
        location=response.headers.get("location"),
        content_type=response.headers.get("content-type"),
        outcome=outcome,
        reconciliation_required=reconciliation if type(reconciliation) is bool else None,
        automatic_retry_allowed=retry if type(retry) is bool else None,
    )


def _decode(response: httpx.Response, model: Type[ModelT]) -> ModelT:
    if not response.is_success:
        raise _api_error(response)
    try:
        return model.model_validate(response.json())
    except (ValueError, TypeError) as error:
        raise KallfiTransportError("Kallfi returned invalid JSON") from error


def _configuration(
    api_key: str, base_url: Optional[str], surface: str, workspace_id: Optional[str]
) -> tuple[str, dict[str, str]]:
    origins = {"nsfw-disabled": "https://acr.kallfi.com", "nsfw-enabled": "https://acr.kallfi.red"}
    if surface not in origins:
        raise ValueError("surface must be nsfw-disabled or nsfw-enabled")
    origin = base_url or origins[surface]
    parsed = urlparse(origin)
    trusted = {"acr.kallfi.com", "acr.kallfi.red", "api.kallfi.com", "api.kallfi.red"}
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("base_url must be an HTTP origin")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("base_url must not contain credentials, query or fragment")
    if parsed.hostname in trusted:
        if parsed.scheme != "https" or parsed.port not in (None, 443):
            raise ValueError("Kallfi API origins require HTTPS on port 443")
        expected_red = surface == "nsfw-enabled"
        if parsed.hostname.endswith(".red") != expected_red:
            raise ValueError("base_url conflicts with surface")
    elif parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("base_url must be a trusted Kallfi or local development origin")
    if parsed.path not in ("", "/"):
        raise ValueError("base_url must be an origin without a path")
    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
    if workspace_id is not None:
        if not isinstance(workspace_id, str):
            raise ValueError("workspace_id must be a canonical RFC-variant UUID version 1..8")
        try:
            selector = UUID(workspace_id)
        except (ValueError, AttributeError):
            raise ValueError(
                "workspace_id must be a canonical RFC-variant UUID version 1..8"
            ) from None
        if (
            workspace_id.lower() != str(selector)
            or selector.variant != RFC_4122
            or selector.version not in range(1, 9)
        ):
            raise ValueError("workspace_id must be a canonical RFC-variant UUID version 1..8")
        headers["X-Kallfi-Workspace-ID"] = str(selector)
    return origin.rstrip("/"), headers


@dataclass(frozen=True)
class APIResponse:
    status: int
    data: Any
    request_id: Optional[str]
    retry_after: Optional[str]
    location: Optional[str]
    content_type: Optional[str]


_OPERATIONS = {
    item["operationId"]: item
    for item in json.loads(Path(__file__).with_name("operations.json").read_text())["operations"]
}


def _command(
    operation_id: str,
    workspace_id: Optional[str],
    path_params: Optional[dict[str, str]],
    body: Any,
    idempotency_key: Optional[str],
) -> tuple[str, str, dict[str, Any]]:
    if operation_id not in _OPERATIONS:
        raise ValueError("Unknown Kallfi operation")
    operation = _OPERATIONS[operation_id]
    if workspace_id is not None and operation["scope"] == "account":
        raise ValueError("Account operations do not accept a team workspace selector")
    path = operation["path"]
    supplied = path_params or {}
    expected = set(re.findall(r"{([^}]+)}", path))
    if set(supplied) != expected:
        raise ValueError("path_params must match the operation path exactly")
    for name in expected:
        path = path.replace("{" + name + "}", _identifier(supplied[name]))
    kwargs: dict[str, Any] = {}
    if operation["method"] not in {"GET", "HEAD"}:
        kwargs["headers"] = _idempotency_headers(idempotency_key or "")
    elif idempotency_key is not None:
        kwargs["headers"] = _idempotency_headers(idempotency_key)
    if (operation.get("requestBody") or {}).get("required") and body is None:
        raise ValueError("body is required for this operation")
    if body is not None:
        kwargs["json"] = (
            body.model_dump(mode="json", exclude_none=True) if isinstance(body, BaseModel) else body
        )
    return operation["method"], path, kwargs


def _detailed(response: httpx.Response, content: bytes) -> APIResponse:
    if not response.is_success:
        response._content = content
        raise _api_error(response)
    try:
        data = json.loads(content) if content else None
    except ValueError as error:
        raise KallfiTransportError("Kallfi returned invalid JSON") from error
    return APIResponse(
        response.status_code,
        data,
        response.headers.get("x-request-id"),
        response.headers.get("retry-after"),
        response.headers.get("location"),
        response.headers.get("content-type"),
    )


def _read_response(response: httpx.Response, deadline: float, limit: int) -> bytes:
    content = bytearray()
    for chunk in response.iter_bytes():
        _check_deadline(deadline)
        if len(content) + len(chunk) > limit:
            raise KallfiTransportError("Kallfi response exceeded the configured limit")
        content.extend(chunk)
    _check_deadline(deadline)
    return bytes(content)


async def _read_async_response(response: httpx.Response, deadline: float, limit: int) -> bytes:
    content = bytearray()
    async for chunk in response.aiter_bytes():
        _check_deadline(deadline)
        if len(content) + len(chunk) > limit:
            raise KallfiTransportError("Kallfi response exceeded the configured limit")
        content.extend(chunk)
    _check_deadline(deadline)
    return bytes(content)


class _SyncTransport:
    def __init__(
        self, client: httpx.Client, preflight: Callable[[], float], headers: dict[str, str]
    ) -> None:
        self.client = client
        self.preflight = preflight
        self.headers = headers

    def request(self, method: str, path: str, model: Type[ModelT], **kwargs: Any) -> ModelT:
        response, content = self.send(method, path, 8 * 1024 * 1024, **kwargs)
        return _decode(
            httpx.Response(response.status_code, headers=response.headers, content=content), model
        )

    def send(
        self, method: str, path: str, max_response_bytes: int, **kwargs: Any
    ) -> tuple[httpx.Response, bytes]:
        remaining = self.preflight()
        deadline = time.monotonic() + remaining
        kwargs["headers"] = {**self.headers, **kwargs.get("headers", {})}
        try:
            with self.client.stream(
                method, path, follow_redirects=False, auth=None, timeout=remaining, **kwargs
            ) as response:
                content = _read_response(response, deadline, max_response_bytes)
                return response, content
        except httpx.TimeoutException as error:
            raise KallfiTimeoutError("Kallfi request timed out") from error
        except httpx.HTTPError as error:
            raise KallfiTransportError("Kallfi request failed") from error


class _SourceAssets:
    def __init__(self, transport: _SyncTransport) -> None:
        self._transport = transport

    def create(
        self, body: models.SourceAssetCreateRequest, *, idempotency_key: str
    ) -> models.SourceAssetAcceptedResponse:
        return self._transport.request(
            "POST",
            "/v1/soul-source-assets",
            models.SourceAssetAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )


class _Souls:
    def __init__(self, transport: _SyncTransport) -> None:
        self._transport = transport

    def create(
        self, body: models.SoulCreateRequest, *, idempotency_key: str
    ) -> models.SoulAcceptedResponse:
        return self._transport.request(
            "POST",
            "/v1/souls",
            models.SoulAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )

    def retrieve(self, soul_id: Identifier) -> models.Soul:
        return self._transport.request("GET", f"/v1/souls/{_identifier(soul_id)}", models.Soul)

    def update(
        self, soul_id: Identifier, body: models.SoulUpdateRequest, *, idempotency_key: str
    ) -> models.SoulUpdateAcceptedResponse:
        return self._transport.request(
            "PATCH",
            f"/v1/souls/{_identifier(soul_id)}",
            models.SoulUpdateAcceptedResponse,
            json=body.model_dump(mode="json", exclude_none=True),
            headers=_idempotency_headers(idempotency_key),
        )

    def create_response(
        self, soul_id: Identifier, body: models.ResponseCreateRequest, *, idempotency_key: str
    ) -> models.OperationAcceptedResponse:
        return self._transport.request(
            "POST",
            f"/v1/souls/{_identifier(soul_id)}/responses",
            models.OperationAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )

    def create_generation(
        self, soul_id: Identifier, body: models.GenerationCreateRequest, *, idempotency_key: str
    ) -> models.OperationAcceptedResponse:
        return self._transport.request(
            "POST",
            f"/v1/souls/{_identifier(soul_id)}/generations",
            models.OperationAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )


class _Operations:
    def __init__(self, transport: _SyncTransport) -> None:
        self._transport = transport

    def retrieve(self, operation_id: Identifier) -> models.Operation:
        return self._transport.request(
            "GET", f"/v1/operations/{_identifier(operation_id)}", models.Operation
        )

    def wait(
        self, operation_id: Identifier, *, timeout: float = 120.0, interval: float = 2.0
    ) -> models.Operation:
        if timeout <= 0:
            raise ValueError("timeout must be positive")
        if interval < 0.1 or interval > 30:
            raise ValueError("interval must be between 0.1 and 30 seconds")
        deadline = time.monotonic() + timeout
        while True:
            operation = self.retrieve(operation_id)
            if operation.root.status in {
                models.OperationStatus.succeeded,
                models.OperationStatus.failed,
                models.OperationStatus.canceled,
            }:
                return operation
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise KallfiTimeoutError(f"Operation did not finish within {timeout} seconds")
            time.sleep(min(interval, remaining))


class Kallfi:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: Optional[str] = None,
        surface: str = "nsfw-disabled",
        workspace_id: Optional[str] = None,
        timeout: float = 30.0,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("api_key is required")
        base_url, headers = _configuration(api_key, base_url, surface, workspace_id)
        if http_client is not None and str(http_client.base_url).rstrip("/") != base_url:
            raise ValueError("http_client base_url must match the selected API origin")
        if not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("timeout must be finite and positive")
        self._timeout = timeout
        self._workspace_id = workspace_id
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(
            base_url=base_url.rstrip("/"), timeout=timeout, follow_redirects=False
        )
        if "x-kallfi-workspace-id" in self._client.headers:
            raise ValueError("http_client must not preconfigure workspace selection")
        self._transport = _SyncTransport(self._client, self._ensure_workspace, headers)
        self.source_assets = _SourceAssets(self._transport)
        self.souls = _Souls(self._transport)
        self.operations = _Operations(self._transport)

    def _ensure_workspace(self) -> float:
        started = time.monotonic()
        if self._workspace_id is not None:
            _workspace_preflight(self._client, self._timeout)
        remaining = self._timeout - (time.monotonic() - started)
        if remaining <= 0:
            raise KallfiTimeoutError("Workspace discovery exhausted the request timeout budget")
        return remaining

    def call(
        self,
        operation_id: str,
        *,
        body: Any = None,
        path_params: Optional[dict[str, str]] = None,
        query: Optional[dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        max_response_bytes: int = 8 * 1024 * 1024,
    ) -> APIResponse:
        """Execute one canonical operation once; no automatic mutation retries."""
        if max_response_bytes <= 0:
            raise ValueError("max_response_bytes must be positive")
        method, path, kwargs = _command(
            operation_id, self._workspace_id, path_params, body, idempotency_key
        )
        response, content = self._transport.send(
            method, path, max_response_bytes, params=query, **kwargs
        )
        return _detailed(response, content)

    @classmethod
    def from_env(cls, **kwargs: Any) -> Kallfi:
        api_key = os.environ.get("KALLFI_API_KEY")
        if not api_key:
            raise ValueError("KALLFI_API_KEY is required")
        return cls(api_key=api_key, **kwargs)

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> Kallfi:
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()


class _AsyncTransport:
    def __init__(
        self,
        client: httpx.AsyncClient,
        preflight: Callable[[], Awaitable[float]],
        headers: dict[str, str],
        timeout: float,
    ) -> None:
        self.client = client
        self.preflight = preflight
        self.headers = headers
        self.timeout = timeout

    async def request(self, method: str, path: str, model: Type[ModelT], **kwargs: Any) -> ModelT:
        try:
            return await asyncio.wait_for(
                self._request(method, path, model, **kwargs), timeout=self.timeout
            )
        except asyncio.TimeoutError as error:
            raise KallfiTimeoutError(
                "Kallfi request exceeded its overall timeout budget"
            ) from error

    async def _request(self, method: str, path: str, model: Type[ModelT], **kwargs: Any) -> ModelT:
        response, content = await self.send(method, path, 8 * 1024 * 1024, **kwargs)
        return _decode(
            httpx.Response(response.status_code, headers=response.headers, content=content), model
        )

    async def send(
        self, method: str, path: str, max_response_bytes: int, **kwargs: Any
    ) -> tuple[httpx.Response, bytes]:
        remaining = await self.preflight()
        deadline = time.monotonic() + remaining
        kwargs["headers"] = {**self.headers, **kwargs.get("headers", {})}
        try:
            async with self.client.stream(
                method, path, follow_redirects=False, auth=None, timeout=remaining, **kwargs
            ) as response:
                content = await _read_async_response(response, deadline, max_response_bytes)
                return response, content
        except httpx.TimeoutException as error:
            raise KallfiTimeoutError("Kallfi request timed out") from error
        except httpx.HTTPError as error:
            raise KallfiTransportError("Kallfi request failed") from error


class _AsyncSourceAssets:
    def __init__(self, transport: _AsyncTransport) -> None:
        self._transport = transport

    async def create(
        self, body: models.SourceAssetCreateRequest, *, idempotency_key: str
    ) -> models.SourceAssetAcceptedResponse:
        return await self._transport.request(
            "POST",
            "/v1/soul-source-assets",
            models.SourceAssetAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )


class _AsyncSouls:
    def __init__(self, transport: _AsyncTransport) -> None:
        self._transport = transport

    async def create(
        self, body: models.SoulCreateRequest, *, idempotency_key: str
    ) -> models.SoulAcceptedResponse:
        return await self._transport.request(
            "POST",
            "/v1/souls",
            models.SoulAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )

    async def retrieve(self, soul_id: Identifier) -> models.Soul:
        return await self._transport.request(
            "GET", f"/v1/souls/{_identifier(soul_id)}", models.Soul
        )

    async def update(
        self, soul_id: Identifier, body: models.SoulUpdateRequest, *, idempotency_key: str
    ) -> models.SoulUpdateAcceptedResponse:
        return await self._transport.request(
            "PATCH",
            f"/v1/souls/{_identifier(soul_id)}",
            models.SoulUpdateAcceptedResponse,
            json=body.model_dump(mode="json", exclude_none=True),
            headers=_idempotency_headers(idempotency_key),
        )

    async def create_response(
        self, soul_id: Identifier, body: models.ResponseCreateRequest, *, idempotency_key: str
    ) -> models.OperationAcceptedResponse:
        return await self._transport.request(
            "POST",
            f"/v1/souls/{_identifier(soul_id)}/responses",
            models.OperationAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )

    async def create_generation(
        self, soul_id: Identifier, body: models.GenerationCreateRequest, *, idempotency_key: str
    ) -> models.OperationAcceptedResponse:
        return await self._transport.request(
            "POST",
            f"/v1/souls/{_identifier(soul_id)}/generations",
            models.OperationAcceptedResponse,
            json=body.model_dump(mode="json"),
            headers=_idempotency_headers(idempotency_key),
        )


class _AsyncOperations:
    def __init__(self, transport: _AsyncTransport) -> None:
        self._transport = transport

    async def retrieve(self, operation_id: Identifier) -> models.Operation:
        return await self._transport.request(
            "GET", f"/v1/operations/{_identifier(operation_id)}", models.Operation
        )

    async def wait(
        self, operation_id: Identifier, *, timeout: float = 120.0, interval: float = 2.0
    ) -> models.Operation:
        if timeout <= 0:
            raise ValueError("timeout must be positive")
        if interval < 0.1 or interval > 30:
            raise ValueError("interval must be between 0.1 and 30 seconds")
        deadline = time.monotonic() + timeout
        while True:
            operation = await self.retrieve(operation_id)
            if operation.root.status in {
                models.OperationStatus.succeeded,
                models.OperationStatus.failed,
                models.OperationStatus.canceled,
            }:
                return operation
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise KallfiTimeoutError(f"Operation did not finish within {timeout} seconds")
            await asyncio.sleep(min(interval, remaining))


class AsyncKallfi:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: Optional[str] = None,
        surface: str = "nsfw-disabled",
        workspace_id: Optional[str] = None,
        timeout: float = 30.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("api_key is required")
        base_url, headers = _configuration(api_key, base_url, surface, workspace_id)
        if http_client is not None and str(http_client.base_url).rstrip("/") != base_url:
            raise ValueError("http_client base_url must match the selected API origin")
        if not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("timeout must be finite and positive")
        self._timeout = timeout
        self._workspace_id = workspace_id
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(
            base_url=base_url.rstrip("/"), timeout=timeout, follow_redirects=False
        )
        if "x-kallfi-workspace-id" in self._client.headers:
            raise ValueError("http_client must not preconfigure workspace selection")
        self._transport = _AsyncTransport(
            self._client, self._ensure_workspace, headers, self._timeout
        )
        self.source_assets = _AsyncSourceAssets(self._transport)
        self.souls = _AsyncSouls(self._transport)
        self.operations = _AsyncOperations(self._transport)

    async def _ensure_workspace(self) -> float:
        started = time.monotonic()
        if self._workspace_id is not None:
            try:
                await asyncio.wait_for(
                    _async_workspace_preflight(self._client, self._timeout), timeout=self._timeout
                )
            except asyncio.TimeoutError as error:
                raise KallfiTimeoutError("Workspace capability discovery timed out") from error
        remaining = self._timeout - (time.monotonic() - started)
        if remaining <= 0:
            raise KallfiTimeoutError("Workspace discovery exhausted the request timeout budget")
        return remaining

    async def call(
        self,
        operation_id: str,
        *,
        body: Any = None,
        path_params: Optional[dict[str, str]] = None,
        query: Optional[dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        max_response_bytes: int = 8 * 1024 * 1024,
    ) -> APIResponse:
        try:
            return await asyncio.wait_for(
                self._call(
                    operation_id,
                    body=body,
                    path_params=path_params,
                    query=query,
                    idempotency_key=idempotency_key,
                    max_response_bytes=max_response_bytes,
                ),
                timeout=self._timeout,
            )
        except asyncio.TimeoutError as error:
            raise KallfiTimeoutError(
                "Kallfi request exceeded its overall timeout budget"
            ) from error

    async def _call(
        self,
        operation_id: str,
        *,
        body: Any = None,
        path_params: Optional[dict[str, str]] = None,
        query: Optional[dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        max_response_bytes: int = 8 * 1024 * 1024,
    ) -> APIResponse:
        """Execute one canonical operation once; no automatic mutation retries."""
        if max_response_bytes <= 0:
            raise ValueError("max_response_bytes must be positive")
        method, path, kwargs = _command(
            operation_id, self._workspace_id, path_params, body, idempotency_key
        )
        response, content = await self._transport.send(
            method, path, max_response_bytes, params=query, **kwargs
        )
        return _detailed(response, content)

    @classmethod
    def from_env(cls, **kwargs: Any) -> AsyncKallfi:
        api_key = os.environ.get("KALLFI_API_KEY")
        if not api_key:
            raise ValueError("KALLFI_API_KEY is required")
        return cls(api_key=api_key, **kwargs)

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> AsyncKallfi:
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.close()
