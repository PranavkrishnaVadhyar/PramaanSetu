import bcrypt

def hash_password(password: str) -> str:
    # bcrypt truncates at 72 bytes; enforce safely
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    pwd_bytes = password.encode('utf-8')[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, password_hash.encode('utf-8'))
    except Exception:
        return False

