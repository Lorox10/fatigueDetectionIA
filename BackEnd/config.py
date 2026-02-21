from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Base de datos
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "fatigue_detection"
    
    # API
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    API_URL: str = "http://localhost:8000"
    
    # Seguridad
    JWT_SECRET: str = "fatigueDetectionSuperSecret2026"
    
    class Config:
        env_file = ".env"

settings = Settings()
