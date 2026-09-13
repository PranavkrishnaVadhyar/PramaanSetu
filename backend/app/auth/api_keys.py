import secrets
import hashlib

def generate_api_key(environment: str) -> tuple[str, str, str]:
    """Returns (full_key, key_hash, display_prefix). full_key is shown to the
    user ONCE at creation time and never stored or retrievable again."""
    raw = secrets.token_urlsafe(32)
    prefix = "sk_live_" if environment == "live" else "sk_test_"
    full_key = f"{prefix}{raw}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    display_prefix = f"{prefix}••••••{raw[-4:]}"
    return full_key, key_hash, display_prefix

def hash_key_for_lookup(provided_key: str) -> str:
    return hashlib.sha256(provided_key.encode()).hexdigest()
