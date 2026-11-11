from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

def normalize_database_url(url: str) -> str:
    """Normalize PostgreSQL dialect scheme for SQLAlchemy 2.0 and psycopg2 compatibility."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

# Engine configuration with dialect-specific connection arguments
normalized_db_url = normalize_database_url(settings.DATABASE_URL)
is_sqlite = normalized_db_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
pool_kwargs = {"pool_pre_ping": True}
if not is_sqlite:
    pool_kwargs["pool_size"] = 10
    pool_kwargs["max_overflow"] = 20

engine = create_engine(
    normalized_db_url,
    connect_args=connect_args,
    **pool_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_database_schema(target_engine=None):
    """Ensure all required columns exist in database tables for SQLite / PostgreSQL."""
    eng = target_engine or engine
    try:
        with eng.connect() as conn:
            insp = inspect(conn)
            tables = insp.get_table_names()

            if "ml_datasets" in tables:
                cols_ds = [c["name"] for c in insp.get_columns("ml_datasets")]
                new_ds_cols = [
                    ("file_format", "VARCHAR(16) DEFAULT 'csv'"),
                    ("dataset_type", "VARCHAR(32) DEFAULT 'RESEARCH'"),
                    ("version", "VARCHAR(32) DEFAULT '1.0.0'"),
                    ("columns_meta_json", "TEXT DEFAULT '{}'")
                ]
                for col_name, col_type in new_ds_cols:
                    if col_name not in cols_ds:
                        conn.execute(text(f"ALTER TABLE ml_datasets ADD COLUMN {col_name} {col_type}"))

            if "ml_models" in tables:
                cols_m = [c["name"] for c in insp.get_columns("ml_models")]
                new_m_cols = [
                    ("task_type", "VARCHAR(32) DEFAULT 'classification'"),
                    ("target_variable", "VARCHAR(64)"),
                    ("validation_strategy", "VARCHAR(128) DEFAULT 'Held-Out 80/20'"),
                    ("status", "VARCHAR(32) DEFAULT 'TRAINED'"),
                    ("cv_scores_json", "TEXT DEFAULT '{}'"),
                    ("training_logs_json", "TEXT DEFAULT '[]'")
                ]
                for col_name, col_type in new_m_cols:
                    if col_name not in cols_m:
                        conn.execute(text(f"ALTER TABLE ml_models ADD COLUMN {col_name} {col_type}"))

            conn.commit()
    except Exception as e:
        # Silently log if schema alteration is already applied
        pass

def get_db():
    """Dependency yield for FastAPI route database sessions."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
