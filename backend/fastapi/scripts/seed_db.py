"""
Entry point to run database seed from CLI or Docker:
python -m scripts.seed_db
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.seed import seed

if __name__ == "__main__":
    asyncio.run(seed())
