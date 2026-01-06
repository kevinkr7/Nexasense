from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    PROJECT_NAME = os.getenv("NexaSense", "NexaSense Backend")
    ENV = os.getenv("ENV", "development")

settings = Settings()
