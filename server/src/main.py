from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.db import SessionLocal
from src.features.translations.service import load_translations_into_memory
from src.features.cars.routes import router as cars_router
from src.features.auth.routes import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    with SessionLocal() as session:
        load_translations_into_memory(session)
    yield

app = FastAPI(title="Car API", lifespan=lifespan)

origins = [
    "http://localhost:3000",  # frontend dev server
    "http://127.0.0.1:3000",  # sometimes needed
    # "https://your-production-frontend.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth_router)
app.include_router(cars_router)

@app.get("/health")
async def health():
    return {"status": "ok"}