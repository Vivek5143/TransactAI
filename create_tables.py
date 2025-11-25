"""
Create database tables script.
Works both locally and in Docker by using environment variables.
"""

import os
import sys
from pathlib import Path

# Add backend to path if running from root
backend_path = Path(__file__).parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import after path setup
from api.db import Base, engine
from api.models import User, Transaction, Feedback

if __name__ == "__main__":
    print("=" * 50)
    print("Creating database tables...")
    print(f"Database URL: {os.getenv('DB_HOST', 'postgres')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'transactai')}")
    
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully.")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
