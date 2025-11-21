from api.db import Base, engine
import api.models  # Import models so SQLAlchemy registers them

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")
