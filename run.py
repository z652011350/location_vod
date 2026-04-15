import uvicorn
from app.core.config import load_config


def main():
    settings = load_config()
    uvicorn.run(
        "app.main:app",
        host=settings.app.host,
        port=settings.app.port,
        reload=False,
    )


if __name__ == "__main__":
    main()
