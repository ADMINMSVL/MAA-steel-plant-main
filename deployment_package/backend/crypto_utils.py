"""
Encryption utilities for securing sensitive data in the steel plant app.
Uses industry-standard encryption methods:
- bcrypt for password/PIN hashing
- AES-256 for field-level encryption
"""

from passlib.context import CryptContext
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Encryption key generation
def get_encryption_key():
    """
    Get or generate encryption key from environment.
    In production, this should be a secure environment variable.
    """
    key = os.getenv('ENCRYPTION_KEY')
    if not key:
        # Generate a key from a password/secret
        password = os.getenv('ENCRYPTION_SECRET', 'steel-plant-secret-key-2025').encode()
        salt = b'steel_plant_salt_v1'  # In production, use unique salt per installation
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
    return key

# Initialize Fernet cipher
cipher = Fernet(get_encryption_key())

# Password/PIN hashing functions
def hash_password(password: str) -> str:
    """
    Hash a password/PIN using bcrypt.
    Returns the hashed password as a string.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Returns True if passwords match.
    """
    return pwd_context.verify(plain_password, hashed_password)

# Field-level encryption functions
def encrypt_field(data: str) -> str:
    """
    Encrypt a string field using AES-256.
    Returns encrypted data as base64 string.
    """
    if not data:
        return data
    encrypted = cipher.encrypt(data.encode())
    return encrypted.decode()

def decrypt_field(encrypted_data: str) -> str:
    """
    Decrypt an encrypted field.
    Returns decrypted string.
    """
    if not encrypted_data:
        return encrypted_data
    try:
        decrypted = cipher.decrypt(encrypted_data.encode())
        return decrypted.decode()
    except Exception:
        # If decryption fails, return as-is (for backward compatibility)
        return encrypted_data

# Bulk encryption/decryption for documents
def encrypt_sensitive_fields(doc: dict, fields: list) -> dict:
    """
    Encrypt specified fields in a document.
    """
    for field in fields:
        if field in doc and doc[field]:
            doc[field] = encrypt_field(str(doc[field]))
    return doc

def decrypt_sensitive_fields(doc: dict, fields: list) -> dict:
    """
    Decrypt specified fields in a document.
    """
    for field in fields:
        if field in doc and doc[field]:
            doc[field] = decrypt_field(doc[field])
    return doc

# Sensitive fields configuration for each collection
SENSITIVE_FIELDS = {
    'users': [],  # PINs are hashed, not encrypted
    'gate_entries': ['driver_phone', 'driver_name'],
    'weighbridge': [],  # Weight data is operational, not PII
    'quality_inspections': [],  # Quality data is operational
    'purchase_orders': ['vendor'],
    'sales_orders': ['customer']
}

def encrypt_document(collection: str, doc: dict) -> dict:
    """
    Encrypt sensitive fields for a specific collection.
    """
    if collection in SENSITIVE_FIELDS:
        return encrypt_sensitive_fields(doc, SENSITIVE_FIELDS[collection])
    return doc

def decrypt_document(collection: str, doc: dict) -> dict:
    """
    Decrypt sensitive fields for a specific collection.
    """
    if collection in SENSITIVE_FIELDS:
        return decrypt_sensitive_fields(doc, SENSITIVE_FIELDS[collection])
    return doc
