import json
from pathlib import Path

import pytest

from kallfi.client import _configuration

CASES = json.loads((Path(__file__).parent / "fixtures/workspace-uuid-cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
def test_workspace_selector_matches_shared_uuid_contract(case):
    if case["accepted"]:
        _, headers = _configuration("fixture-no-network", None, "nsfw-disabled", case["value"])
        assert headers["X-Kallfi-Workspace-ID"] == case["value"].lower()
    else:
        with pytest.raises(ValueError):
            _configuration("fixture-no-network", None, "nsfw-disabled", case["value"])
