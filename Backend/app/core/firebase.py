import firebase_admin
from firebase_admin import credentials

# Path to your service account key JSON
SERVICE_ACCOUNT_PATH = "firebase-service-account.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
