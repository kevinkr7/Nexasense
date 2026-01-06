from google.cloud import firestore
from google.oauth2 import service_account

# Path to your Firebase service account key
SERVICE_ACCOUNT_FILE = "firebase-service-account.json"

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE
)

db = firestore.Client(credentials=credentials, project=credentials.project_id)
