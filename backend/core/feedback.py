import psycopg2
import os

class FeedbackStore:
    def __init__(self):
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_name = os.getenv("DB_NAME", "TransactAI")
        self.db_user = os.getenv("DB_USER", "postgres")
        self.db_pass = os.getenv("DB_PASS", "admin")
        self.db_port = os.getenv("DB_PORT", "5432")

        self.connection = self._connect()
        self._init_table()

    def _connect(self):
        return psycopg2.connect(
            host=self.db_host,
            database=self.db_name,
            user=self.db_user,
            password=self.db_pass,
            port=self.db_port
        )

    def _init_table(self):
        """Create feedback table if not exists."""
        cursor = self.connection.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            raw_text TEXT,
            cleaned_text TEXT,
            predicted_category VARCHAR(100),
            correct_category VARCHAR(100),
            confidence FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        self.connection.commit()
        cursor.close()

    def save_feedback(self, raw, cleaned, predicted, correct, confidence):
        """Insert feedback entry into PostgreSQL."""
        cursor = self.connection.cursor()

        cursor.execute("""
            INSERT INTO feedback (raw_text, cleaned_text, predicted_category, correct_category, confidence)
            VALUES (%s, %s, %s, %s, %s)
        """, (raw, cleaned, predicted, correct, confidence))

        self.connection.commit()
        cursor.close()
