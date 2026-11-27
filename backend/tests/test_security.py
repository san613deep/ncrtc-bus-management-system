"""Unit tests for password hashing and JWT token handling.

These tests intentionally avoid PostgreSQL and Redis; they validate the
cryptographic helpers independently of infrastructure services.
"""
import sys
from pathlib import Path

import pytest

# Make the backend package importable when pytest is invoked from tests/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_verifies_only_the_original_password():
    encoded = hash_password("local-test-password")

    assert encoded != "local-test-password"
    assert verify_password("local-test-password", encoded)
    assert not verify_password("different-password", encoded)


def test_access_token_round_trip_contains_expected_claims():
    token, token_id = create_access_token(
        user_id=42,
        role="depot_manager",
        depot_id=7,
    )

    payload = decode_access_token(token)

    assert payload["sub"] == "42"
    assert payload["role"] == "depot_manager"
    assert payload["depot_id"] == 7
    assert payload["jti"] == token_id
    assert "exp" in payload


def test_tampered_access_token_is_rejected():
    token, _ = create_access_token(user_id=1, role="admin", depot_id=None)

    with pytest.raises(JWTError):
        decode_access_token(token + "tampered")
