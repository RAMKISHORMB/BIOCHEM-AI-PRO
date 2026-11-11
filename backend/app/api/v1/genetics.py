from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from app.core.deps import get_current_user
from app.models.user import User
from app.services.genetics_data import search_inborn_errors, INBORN_ERRORS_DATABASE

router = APIRouter(prefix="/genetics", tags=["Gene & Enzyme Relationship Explorer"])

@router.get("/inborn-errors")
def get_inborn_errors(
    search: str = Query("", description="Search by gene symbol, disease name, enzyme or EC number"),
    current_user: User = Depends(get_current_user)
):
    """Search curated catalog of inborn errors of metabolism and enzyme deficiencies."""
    results = search_inborn_errors(search)
    return {
        "total": len(results),
        "results": results
    }
