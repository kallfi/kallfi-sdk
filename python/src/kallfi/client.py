from __future__ import annotations

import asyncio
import os
import time
from typing import Any, Optional, Type, TypeVar, Union
from urllib.parse import quote

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


class KallfiAPIError(KallfiError):
    def __init__(
        self,
        *,
        status: int,
        code: str,
        message: str,
        request_id: Optional[str] = None,
        details: Optional[dict[str, str]] = None,
        retry_after: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id
        self.details = details
        self.retry_after = retry_after


def _identifier(value: Identifier) -> str:
    raw = value.root if isinstance(value, RootModel) else value
    return quote(str(raw), safe="")


def _idempotency_headers(idempotency_key: str) -> dict[str, str]:
    if not idempotency_key or not idempotency_key.strip():
        raise ValueError("idempotency_key is required for mutations")
    return {"Idempotency-Key": idempotency_key}


def _api_error(response: httpx.Response) -> KallfiAPIError:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    error = payload.get("error", {}) if isinstance(payload, dict) else {}
    return KallfiAPIError(
        status=response.status_code,
        code=error.get("code", "http_error"),
        message=error.get("message", f"Kallfi API request failed ({response.status_code})"),
        request_id=error.get("request_id"),
        details=error.get("details"),
        retry_after=response.headers.get("retry-after"),
    )


def _decode(response: httpx.Response, model: Type[ModelT]) -> ModelT:
    if not response.is_success:
        raise _api_error(response)
    try:
        return model.model_validate(response.json())
    except (ValueError, TypeError) as error:
        raise KallfiTransportError("Kallfi returned invalid JSON") from error


class _SyncTransport:
    def __init__(self, client: httpx.Client) -> None:
        self.client = client

    def request(self, method: str, path: str, model: Type[ModelT], **kwargs: Any) -> ModelT:
        try:
            return _decode(self.client.request(method, path, **kwargs), model)
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
            if operation.status in {
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
        base_url: str = "https://api.kallfi.com",
        timeout: float = 30.0,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("api_key is required")
        self._owns_client = http_client is None
        self._client = http_client or httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout)
        self._client.headers.update(
            {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
        )
        transport = _SyncTransport(self._client)
        self.source_assets = _SourceAssets(transport)
        self.souls = _Souls(transport)
        self.operations = _Operations(transport)

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
    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client

    async def request(self, method: str, path: str, model: Type[ModelT], **kwargs: Any) -> ModelT:
        try:
            return _decode(await self.client.request(method, path, **kwargs), model)
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
            if operation.status in {
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
        base_url: str = "https://api.kallfi.com",
        timeout: float = 30.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("api_key is required")
        self._owns_client = http_client is None
        self._client = http_client or httpx.AsyncClient(
            base_url=base_url.rstrip("/"), timeout=timeout
        )
        self._client.headers.update(
            {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
        )
        transport = _AsyncTransport(self._client)
        self.source_assets = _AsyncSourceAssets(transport)
        self.souls = _AsyncSouls(transport)
        self.operations = _AsyncOperations(transport)

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
