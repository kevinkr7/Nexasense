import json
import os
import firebase_admin
from firebase_admin import credentials

# Path to your service account key JSON for local dev
SERVICE_ACCOUNT_PATH = "firebase-service-account.json"

if not firebase_admin._apps:
    service_account_env = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if service_account_env:
        # Load from environment variable (Google Cloud Run)
        cred_dict = json.loads(service_account_env)
        cred = credentials.Certificate(cred_dict)
    else:
        # Fallback to local file for development
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
