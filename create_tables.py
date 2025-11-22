from api.db import Base, engine
from api.models import User, Transaction, Feedback

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully.")
