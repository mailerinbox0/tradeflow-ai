from pathlib import Path

from dotenv import load_dotenv
import uvicorn

from app.config import get_settings

load_dotenv(Path(__file__).resolve().parent / ".env")

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
