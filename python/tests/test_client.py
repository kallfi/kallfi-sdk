import asyncio

import httpx
import pytest

from kallfi import AsyncKallfi, Kallfi, KallfiAPIError, KallfiTransportError


def soul_payload():
    return {
        "soul_id": "soul_valid",
        "external_soul_id": "external-1",
        "kind": "human",
        "description": "A host",
        "lifecycle": "draft",
        "revision": 1,
        "source_asset_ids": [],
        "capabilities": {"responses": True, "image_generation": False, "video_generation": False},
        "created_at": "2026-09-03T00:00:00Z",
        "updated_at": "2026-09-03T00:00:00Z",
    }


def operation_payload(status: str):
    return {
        "operation_id": "op_1",
        "kind": "soul_creation",
        "status": status,
        "created_at": "2026-09-03T00:00:00Z",
        "updated_at": "2026-09-03T00:00:00Z",
    }


def test_auth_and_safe_path_encoding():
    seen = {}

    def handler(request):
        seen["request"] = request
        return httpx.Response(200, json=soul_payload())

    client = httpx.Client(
        base_url="https://example.test",
        headers={"Authorization": "Bearer secret", "Accept": "application/json"},
        transport=httpx.MockTransport(handler),
    )
    sdk = Kallfi(api_key="secret", http_client=client)
    sdk.souls.retrieve("soul_a/b")
    assert seen["request"].url.raw_path.endswith(b"/v1/souls/soul_a%2Fb")
    assert seen["request"].headers["authorization"] == "Bearer secret"


def test_structured_error_and_retry_after():
    def handler(request):
        return httpx.Response(
            429,
            headers={"retry-after": "4"},
            json={
                "error": {
                    "code": "rate_limited",
                    "message": "wait",
                    "request_id": "req_1",
                    "details": {"scope": "company"},
                }
            },
        )

    sdk = Kallfi(
        api_key="secret",
        http_client=httpx.Client(
            base_url="https://example.test", transport=httpx.MockTransport(handler)
        ),
    )
    with pytest.raises(KallfiAPIError) as raised:
        sdk.operations.retrieve("op_valid")
    assert (
        raised.value.status,
        raised.value.code,
        raised.value.request_id,
        raised.value.retry_after,
    ) == (429, "rate_limited", "req_1", "4")


def test_invalid_json_is_transport_error():
    def handler(request):
        return httpx.Response(200, text="not-json")

    sdk = Kallfi(
        api_key="secret",
        http_client=httpx.Client(
            base_url="https://example.test", transport=httpx.MockTransport(handler)
        ),
    )
    with pytest.raises(KallfiTransportError):
        sdk.operations.retrieve("op_valid")


def test_wait_is_bounded_and_returns_terminal_operation():
    statuses = iter(["accepted", "succeeded"])

    def handler(request):
        return httpx.Response(200, json=operation_payload(next(statuses)))

    sdk = Kallfi(
        api_key="secret",
        http_client=httpx.Client(
            base_url="https://example.test", transport=httpx.MockTransport(handler)
        ),
    )
    operation = sdk.operations.wait("op_1", timeout=1, interval=0.1)
    assert operation.status.value == "succeeded"


def test_async_client_uses_the_same_typed_resource_contract():
    async def scenario():
        async def handler(request):
            assert request.headers["authorization"] == "Bearer secret"
            return httpx.Response(200, json=soul_payload())

        client = httpx.AsyncClient(
            base_url="https://example.test", transport=httpx.MockTransport(handler)
        )
        async with AsyncKallfi(api_key="secret", http_client=client) as sdk:
            soul = await sdk.souls.retrieve("soul_valid")
            assert soul.soul_id.root == "soul_valid"
        await client.aclose()

    asyncio.run(scenario())
