import httpx
import pytest

from kallfi.client import _api_error


@pytest.mark.parametrize("payload,expected", [
    ({"error": {"code": "native_denied"}, "code": "root_denied"}, "native_denied"),
    ({"error": "native_unavailable"}, "native_unavailable"),
    ({"error": "Human prose with private material"}, "http_error"),
    ({"code": "secret_fixture"}, "http_error"),
    ({"code": "a" * 97}, "http_error"),
])
def test_finite_codes_never_expose_prose_or_key(payload, expected):
    response = httpx.Response(502, json=payload, request=httpx.Request(
        "POST", "https://acr.kallfi.com/v1/account/actions/prepareAccountSoulBilling",
        headers={"Authorization": "Bearer secret_fixture"}))
    error = _api_error(response)
    assert error.code == expected
    assert str(error) == "Kallfi API request failed (502)"
    assert error.details is None


def test_nested_finite_outcome_flags_are_strict_and_have_precedence():
    response = httpx.Response(502, json={"error": {
        "code": "native_unavailable", "outcome": "mutation_outcome_unknown",
        "reconciliationRequired": True, "automaticRetryAllowed": False,
        "details": {"private": "discard"}}, "automaticRetryAllowed": True})
    error = _api_error(response)
    assert error.outcome == "mutation_outcome_unknown"
    assert error.reconciliation_required is True
    assert error.automatic_retry_allowed is False
    assert error.details is None
    malformed = _api_error(httpx.Response(502, json={"outcome": "invented",
        "reconciliationRequired": 1, "automaticRetryAllowed": "false"}))
    assert malformed.outcome is None
    assert malformed.reconciliation_required is None
    assert malformed.automatic_retry_allowed is None
