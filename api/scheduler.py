# api/scheduler.py

import threading
import time
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session

from training.train_model import train_with_feedback
from core.model import TransactionClassifier
from api.db import get_db
from api.models import Feedback


def run_nightly_retrain(app, hour=3, minute=0):
    """
    Runs every day at the specified hour/minute.
    Default time: 3:00 AM IST
    """
    def scheduler_thread():
        while True:
            now = datetime.now()

            # next run = tomorrow at 3:00 AM
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if now >= next_run:
                next_run = next_run + timedelta(days=1)

            wait_seconds = (next_run - now).total_seconds()
            print(f"[SCHEDULER] Next retrain scheduled at {next_run} (in {wait_seconds} seconds)")

            time.sleep(wait_seconds)

            # ---- RUN TRAINING ----
            try:
                print("[SCHEDULER] Nightly retrain started...")

                # DB session
                db: Session = next(get_db())
                rows = db.query(Feedback).all()

                if not rows:
                    print("[SCHEDULER] No feedback rows found. Training skipped.")
                    continue

                # Prepare feedback DF
                records = [{"Description": r.message, "Category": r.chosen_category} for r in rows]
                feedback_df = pd.DataFrame.from_records(records)

                # Train
                result = train_with_feedback(feedback_df)
                print(f"[SCHEDULER] Training complete: {result}")

                # Reload classifier in API
                new_classifier = TransactionClassifier()
                new_classifier.load("models", "classifier")
                app.state.classifier = new_classifier

                print("[SCHEDULER] New model reloaded successfully.")

            except Exception as e:
                print("[SCHEDULER] ERROR during nightly retrain:", e)

    # Background thread (daemon)
    thread = threading.Thread(target=scheduler_thread, daemon=True)
    thread.start()
    print("✅ Nightly Retraining Scheduler Started")
