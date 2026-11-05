import httpx
import pytest

from kallfi import ReferencePreflightPending, ReferencePreflightReceipt
from kallfi.client import _api_error

PACKAGE_ID = "8f799c38-e17e-4aa8-8951-4d029205eabc"
FINGERPRINT = "a3" * 32


def pending_payload() -> ReferencePreflightPending:
    receipt: ReferencePreflightReceipt = {
        "version": 1,
        "packageId": PACKAGE_ID,
        "bindingFingerprint": FINGERPRINT,
    }
    return {"referenceSafetyState": "pending", "receipt": receipt}


def test_pending_locator_is_bounded_and_preserves_existing_error_contract():
    payload = {
        **pending_payload(),
        "private": "discard this top-level field",
        "error": {
            "code": "reference_preflight_pending",
            "details": {"private": "discard these details"},
            "outcome": "mutation_outcome_unknown",
            "reconciliationRequired": True,
            "automaticRetryAllowed": False,
        },
    }
    error = _api_error(httpx.Response(409, json=payload))
    assert error.reference_preflight == pending_payload()
    assert error.code == "reference_preflight_pending"
    assert str(error) == "Kallfi API request failed (409)"
    assert error.details is None
    assert error.outcome == "mutation_outcome_unknown"
    assert error.reconciliation_required is True
    assert error.automatic_retry_allowed is False
    payload["receipt"]["packageId"] = "changed"
    assert error.reference_preflight["receipt"]["packageId"] == PACKAGE_ID


@pytest.mark.parametrize("status", [200, 400, 403, 422, 500])
def test_pending_requires_conflict_status(status):
    assert _api_error(httpx.Response(status, json=pending_payload())).reference_preflight is None


@pytest.mark.parametrize("receipt", [
    None,
    [],
    {"version": 1, "packageId": PACKAGE_ID},
    {"version": 1, "packageId": PACKAGE_ID, "bindingFingerprint": FINGERPRINT, "extra": 1},
    *[
        {"version": version, "packageId": PACKAGE_ID, "bindingFingerprint": FINGERPRINT}
        for version in (True, 1.0, "1", 2)
    ],
    *[
        {"version": 1, "packageId": package_id, "bindingFingerprint": FINGERPRINT}
        for package_id in (None, 1, PACKAGE_ID.replace("-", ""), PACKAGE_ID + "\n", "not-a-uuid")
    ],
    *[
        {"version": 1, "packageId": PACKAGE_ID, "bindingFingerprint": fingerprint}
        for fingerprint in (None, 1, "a" * 63, "a" * 65, "g" * 64, FINGERPRINT + "\n")
    ],
])
def test_malformed_receipts_are_discarded(receipt):
    payload = {**pending_payload(), "receipt": receipt}
    assert _api_error(httpx.Response(409, json=payload)).reference_preflight is None


@pytest.mark.parametrize("state", [None, "ready", "PENDING", True])
def test_state_must_be_top_level_pending(state):
    payload = {**pending_payload(), "referenceSafetyState": state}
    assert _api_error(httpx.Response(409, json=payload)).reference_preflight is None
    nested = _api_error(httpx.Response(409, json={"error": pending_payload()}))
    assert nested.reference_preflight is None


@pytest.mark.parametrize("api_key", [PACKAGE_ID, FINGERPRINT, "a3a3"])
def test_key_echo_in_locator_is_discarded(api_key):
    response = httpx.Response(
        409,
        json=pending_payload(),
        request=httpx.Request(
            "POST", "https://api.kallfi.com/v1/test", headers={"Authorization": f"Bearer {api_key}"}
        ),
    )
    error = _api_error(response)
    assert error.reference_preflight is None
    assert error.details is None


def test_ordinary_error_has_no_preflight_and_keeps_strict_flags():
    error = _api_error(httpx.Response(409, json={"error": {
        "code": "normal_conflict", "details": {"private": "discard"},
        "reconciliationRequired": 1, "automaticRetryAllowed": "false",
    }}))
    assert error.reference_preflight is None
    assert error.code == "normal_conflict"
    assert error.details is None
    assert error.reconciliation_required is None
    assert error.automatic_retry_allowed is None
