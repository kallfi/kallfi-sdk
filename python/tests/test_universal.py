import asyncio
import hashlib
import json
from pathlib import Path

import httpx
import pytest

from kallfi import (
    AsyncKallfi,
    Kallfi,
    KallfiAPIError,
    KallfiTransportError,
    WorkspaceUnsupportedError,
)
from kallfi.client import _WORKSPACE_CAPABILITY


def test_contract_drift():
    root = Path(__file__).parents[1]
    source = (root / "openapi/openapi.v1.json").read_bytes()
    manifest = json.loads((root / "src/kallfi/operations.json").read_text())
    assert hashlib.sha256(source).hexdigest() == manifest["sourceSHA256"]
    spec = json.loads(source)
    actual = {
        (o["operationId"], m.upper(), p)
        for p, v in spec["paths"].items()
        for m, o in v.items()
        if isinstance(o, dict) and "operationId" in o
    }
    assert actual == {(o["operationId"], o["method"], o["path"]) for o in manifest["operations"]}
    assert len(actual) == 61


def test_surface_workspace_and_account_rejection():
    seen = []

    def handler(request):
        if request.url.path == "/v1/capabilities":
            return httpx.Response(200, json=_WORKSPACE_CAPABILITY)
        seen.append(request)
        return httpx.Response(200, json={"ok": True})

    client = httpx.Client(base_url="https://acr.kallfi.red", transport=httpx.MockTransport(handler))
    sdk = Kallfi(
        api_key="secret",
        surface="nsfw-enabled",
        workspace_id="00000000-0000-4000-8000-000000000001",
        http_client=client,
    )
    sdk.call("getSoul", path_params={"soul_id": "a/b"})
    assert seen[0].headers["X-Kallfi-Workspace-ID"].endswith("0001")
    assert seen[0].url.raw_path.endswith(b"a%2Fb")
    with pytest.raises(ValueError, match="Account operations"):
        sdk.call("createPost", body={}, idempotency_key="one")
    assert len(seen) == 1
    with pytest.raises(ValueError, match="conflicts"):
        Kallfi(api_key="secret", base_url="https://acr.kallfi.red")
    with pytest.raises(ValueError, match="trusted"):
        Kallfi(api_key="secret", base_url="https://attacker.example")


def test_detailed_errors_no_redirect_or_mutation_retry():
    seen = []

    def handler(request):
        seen.append(request)
        return httpx.Response(
            307, headers={"location": "https://attacker.example"}, json={"error": "bad"}
        )

    sdk = Kallfi(
        api_key="secret",
        http_client=httpx.Client(
            base_url="https://acr.kallfi.com",
            follow_redirects=True,
            transport=httpx.MockTransport(handler),
        ),
    )
    with pytest.raises(ValueError, match="idempotency"):
        sdk.call("createPost", body={})
    with pytest.raises(KallfiAPIError) as caught:
        sdk.call("createPost", body={}, idempotency_key="one")
    assert caught.value.status == 307
    assert len(seen) == 1
    assert seen[0].headers["Idempotency-Key"] == "one"


def test_bounded_detailed_async_response():
    async def scenario():
        client = httpx.AsyncClient(
            base_url="https://acr.kallfi.com",
            transport=httpx.MockTransport(
                lambda request: httpx.Response(
                    202,
                    json={"operation_id": "op1"},
                    headers={
                        "x-request-id": "req1",
                        "retry-after": "2",
                        "location": "/v1/operations/op1",
                    },
                )
            ),
        )
        sdk = AsyncKallfi(api_key="secret", http_client=client)
        result = await sdk.call("createPost", body={}, idempotency_key="one")
        assert (result.status, result.request_id, result.retry_after, result.location) == (
            202,
            "req1",
            "2",
            "/v1/operations/op1",
        )
        with pytest.raises(KallfiTransportError, match="limit"):
            await sdk.call("createPost", body={}, idempotency_key="one", max_response_bytes=2)
        await client.aclose()

    asyncio.run(scenario())


def test_injected_client_cannot_forward_auth_to_another_origin():
    client = httpx.Client(base_url="https://attacker.example")
    with pytest.raises(ValueError, match="must match"):
        Kallfi(api_key="secret", http_client=client)
    assert "authorization" not in client.headers


@pytest.mark.parametrize(
    "operation",
    json.loads((Path(__file__).parents[1] / "src/kallfi/operations.json").read_text())[
        "operations"
    ],
    ids=lambda operation: operation["operationId"],
)
def test_every_operation_uses_canonical_route_and_single_request(operation):
    import re

    seen = []

    def handler(request):
        seen.append(request)
        return httpx.Response(200, json={"ok": True})

    with httpx.Client(
        base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
    ) as client:
        sdk = Kallfi(api_key="secret", http_client=client)
        params = {name: "resource/a" for name in re.findall(r"{([^}]+)}", operation["path"])}
        result = sdk.call(
            operation["operationId"],
            path_params=params,
            body={} if operation["requestBody"] else None,
            idempotency_key="one-intent",
        )
    assert result.data == {"ok": True}
    assert len(seen) == 1
    assert seen[0].method == operation["method"]
    expected = operation["path"]
    for name in params:
        expected = expected.replace("{" + name + "}", "resource%2Fa")
    assert seen[0].url.raw_path == expected.encode()


def test_path_identifiers_cannot_escape_resource_route():
    with Kallfi(api_key="secret") as sdk:
        with pytest.raises(ValueError, match="dot segments"):
            sdk.call("getSoul", path_params={"soul_id": ".."})
        with pytest.raises(ValueError, match="dot segments"):
            sdk.souls.retrieve(".")


def test_idempotency_runtime_limit_without_dispatch():
    seen = []

    def handler(request):
        seen.append(request)
        return httpx.Response(202, json={"ok": True})

    with httpx.Client(
        base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
    ) as client:
        sdk = Kallfi(api_key="secret", http_client=client)
        sdk.call("createPost", body={}, idempotency_key="a" * 128)
        assert seen[0].headers["Idempotency-Key"] == "a" * 128
        with pytest.raises(ValueError, match="128"):
            sdk.call("createPost", body={}, idempotency_key="a" * 129)
        assert len(seen) == 1


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(404, json={"error": "missing"}),
        httpx.Response(200, text="<html>old server</html>"),
        httpx.Response(200, json={"protocolVersion": 0}),
        httpx.Response(200, json={**_WORKSPACE_CAPABILITY, "protocolVersion": True}),
        httpx.Response(302, headers={"location": "https://attacker.example"}),
        httpx.Response(200, json={**_WORKSPACE_CAPABILITY, "selectorHeader": "wrong"}),
    ],
)
def test_unsupported_workspace_discovery_never_dispatches_operation(response):
    seen = []

    def handler(request):
        seen.append(request)
        assert request.url.path == "/v1/capabilities"
        assert "authorization" not in request.headers
        assert "x-kallfi-workspace-id" not in request.headers
        assert "idempotency-key" not in request.headers
        assert "cookie" not in request.headers
        return response

    with httpx.Client(
        base_url="https://acr.kallfi.com",
        cookies={"session": "private"},
        auth=("private", "password"),
        transport=httpx.MockTransport(handler),
    ) as client:
        sdk = Kallfi(
            api_key="secret",
            workspace_id="00000000-0000-4000-8000-000000000001",
            http_client=client,
        )
        with pytest.raises(WorkspaceUnsupportedError) as caught:
            sdk.call("createSoul", body={}, idempotency_key="one")
        assert caught.value.code == "workspace_capability_unsupported"
        assert len(seen) == 1
        with pytest.raises(WorkspaceUnsupportedError):
            sdk.souls.retrieve("soul_one")
        assert len(seen) == 2


def test_async_workspace_capability_is_fresh_and_exempts_personal():
    async def scenario():
        seen = []

        async def handler(request):
            seen.append(request)
            if request.url.path == "/v1/capabilities":
                assert "authorization" not in request.headers
                assert "x-kallfi-workspace-id" not in request.headers
                return httpx.Response(200, json=_WORKSPACE_CAPABILITY)
            return httpx.Response(200, json={"ok": True})

        async with httpx.AsyncClient(
            base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
        ) as client:
            sdk = AsyncKallfi(
                api_key="secret",
                workspace_id="00000000-0000-4000-8000-000000000001",
                http_client=client,
            )
            await sdk.call("createSoul", body={}, idempotency_key="one")
            await sdk.call("getSoul", path_params={"soul_id": "soul_one"})
            assert [r.url.path for r in seen] == [
                "/v1/capabilities",
                "/v1/souls",
                "/v1/capabilities",
                "/v1/souls/soul_one",
            ]
            personal = AsyncKallfi(api_key="secret", http_client=client)
            await personal.call("getSoul", path_params={"soul_id": "soul_one"})
            assert seen[-1].url.path == "/v1/souls/soul_one"
            assert len(seen) == 5
            assert "x-kallfi-workspace-id" not in seen[-1].headers
            assert "x-kallfi-workspace-id" not in client.headers

    asyncio.run(scenario())


def test_async_old_server_and_network_failure_never_dispatch_operation():
    async def scenario():
        for failure in ("old", "timeout"):
            seen = []

            async def handler(request):
                seen.append(request)
                assert request.url.path == "/v1/capabilities"
                if failure == "timeout":
                    raise httpx.ReadTimeout("discovery timeout")
                return httpx.Response(404, json={"error": "missing"})

            async with httpx.AsyncClient(
                base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
            ) as client:
                sdk = AsyncKallfi(
                    api_key="secret",
                    workspace_id="00000000-0000-4000-8000-000000000001",
                    http_client=client,
                )
                with pytest.raises(WorkspaceUnsupportedError):
                    await sdk.call("createSoul", body={}, idempotency_key="one")
                assert len(seen) == 1

    asyncio.run(scenario())


@pytest.mark.parametrize("size", [4096, 4097])
def test_capability_body_limit_matches_typescript(size):
    payload = json.dumps(_WORKSPACE_CAPABILITY).encode()
    payload += b" " * (size - len(payload))
    seen = []

    def handler(request):
        seen.append(request)
        if request.url.path == "/v1/capabilities":
            return httpx.Response(
                200, content=payload, headers={"content-type": "application/json"}
            )
        return httpx.Response(200, json={"ok": True})

    with httpx.Client(
        base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
    ) as client:
        sdk = Kallfi(
            api_key="secret",
            workspace_id="00000000-0000-4000-8000-000000000001",
            http_client=client,
        )
        if size == 4097:
            with pytest.raises(WorkspaceUnsupportedError, match="too large"):
                sdk.call("createSoul", body={}, idempotency_key="one")
            assert len(seen) == 1
        else:
            sdk.call("createSoul", body={}, idempotency_key="one")
            assert len(seen) == 2


def test_async_deadline_cancels_discovery_without_operation_dispatch():
    from kallfi import KallfiTimeoutError

    async def scenario():
        seen = []

        async def handler(request):
            seen.append(request)
            assert request.url.path == "/v1/capabilities"
            await asyncio.sleep(1)
            return httpx.Response(200, json=_WORKSPACE_CAPABILITY)

        async with httpx.AsyncClient(
            base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
        ) as client:
            sdk = AsyncKallfi(
                api_key="secret",
                timeout=0.01,
                workspace_id="00000000-0000-4000-8000-000000000001",
                http_client=client,
            )
            with pytest.raises(KallfiTimeoutError):
                await sdk.call("createSoul", body={}, idempotency_key="one")
            assert len(seen) == 1

    asyncio.run(scenario())


def test_sync_discovery_consumes_operation_timeout_budget():
    import time

    from kallfi import KallfiTimeoutError

    seen = []

    def handler(request):
        seen.append(request)
        assert request.url.path == "/v1/capabilities"
        time.sleep(0.02)
        return httpx.Response(200, json=_WORKSPACE_CAPABILITY)

    with httpx.Client(
        base_url="https://acr.kallfi.com", transport=httpx.MockTransport(handler)
    ) as client:
        sdk = Kallfi(
            api_key="secret",
            timeout=0.01,
            workspace_id="00000000-0000-4000-8000-000000000001",
            http_client=client,
        )
        with pytest.raises(KallfiTimeoutError):
            sdk.call("createSoul", body={}, idempotency_key="one")
        assert len(seen) == 1
