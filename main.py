from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
from src.core.config import settings
from src.core.middleware import setup_middlewares
from src.api.v1.router import api_router
from src.api.tags import API_TAGS
from src.core.init_admin import init_admin

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.DOCS_TITLE,
    description=settings.DOCS_DESCRIPTION,
    version=settings.DOCS_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    openapi_tags=API_TAGS,
    contact={
        "name": settings.DOCS_CONTACT_NAME,
        "email": settings.DOCS_CONTACT_EMAIL
    },
    license_info={
        "name": settings.DOCS_LICENSE_NAME,
        "url": settings.DOCS_LICENSE_URL
    }
)

# Exception handler для ошибок валидации
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    body_str = body.decode('utf-8') if body else ""
    
    # Логируем ошибку валидации
    logger.warning(f"Validation error on {request.method} {request.url}: {exc.errors()}")
    
    # Конвертируем ошибки в сериализуемый формат
    error_details = []
    for error in exc.errors():
        error_details.append({
            "type": error.get("type", ""),
            "loc": list(error.get("loc", [])),
            "msg": error.get("msg", ""),
            "input": str(error.get("input", ""))  # Конвертируем в строку
        })
    
    return JSONResponse(
        status_code=422,
        content={"detail": error_details, "body": body_str}
    )

# Настройка middleware
setup_middlewares(app)

# Подключение API роутера
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {"message": settings.ROOT_MESSAGE}

@app.on_event("startup")
async def startup_event():
    """Выполняется при запуске приложения."""
    logger.info("Starting application initialization...")
    try:
        logger.info("Initializing admin user...")
        await init_admin()
        logger.info("Admin user initialization completed")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise


