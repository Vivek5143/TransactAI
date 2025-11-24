"""End-to-end training script for the hybrid transaction classifier."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import torch
from imblearn.over_sampling import RandomOverSampler
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from core.model import TransactionClassifier
from core.preprocessor import TransactionPreprocessor


SEED = 42
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"


DATA_SPECS: List[Dict[str, object]] = [
    {
        "path": DATA_DIR / "training_dataset.xlsx",
        "text_candidates": ["notification_text", "message", "text", "Description"],
        "label_candidates": ["category", "Category", "label"],
    }
]


def _set_seed(seed: int = SEED):
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def _detect_column(columns: Sequence[str], candidates: Sequence[str]) -> Optional[str]:
    column_set = set(columns)
    lowercase_map = {col.lower(): col for col in columns}
    for candidate in candidates:
        if candidate in column_set:
            return candidate
        lowered = candidate.lower()
        if lowered in lowercase_map:
            return lowercase_map[lowered]
    return None


def _load_dataframe(spec: Dict[str, object]) -> Optional[pd.DataFrame]:
    path: Path = spec["path"]
    if not path.exists():
        print(f"[WARN] Dataset missing: {path}")
        return None

    try:
        if path.suffix.lower() in (".xlsx", ".xls"):
            df = pd.read_excel(path, engine="openpyxl")
        else:
            df = pd.read_csv(path, low_memory=False)
    except Exception as exc:
        print(f"[ERROR] Failed to load {path}: {exc}")
        return None

    text_col = _detect_column(df.columns, spec["text_candidates"])
    label_col = _detect_column(df.columns, spec["label_candidates"])
    if text_col is None or label_col is None:
        print(f"[WARN] Skipping {path.name}: missing text/label columns")
        return None

    subset = df[[text_col, label_col]].rename(columns={text_col: "Description", label_col: "Category"})
    subset = subset.dropna(subset=["Description", "Category"])
    subset["Description"] = subset["Description"].astype(str).str.strip()
    subset["Category"] = subset["Category"].astype(str).str.strip()
    subset = subset[subset["Description"].str.len() > 0]

    print(f"[INFO] Loaded {len(subset)} rows from {path.name}")
    return subset


def prepare_dataset() -> pd.DataFrame:
    frames = []
    for spec in DATA_SPECS:
        frame = _load_dataframe(spec)
        if frame is not None and not frame.empty:
            frames.append(frame)

    if not frames:
        raise RuntimeError("No datasets could be loaded. Please ensure data files exist.")

    combined = pd.concat(frames, ignore_index=True)
    combined = combined.drop_duplicates(subset=["Description", "Category"]).reset_index(drop=True)
    valid = combined["Category"].value_counts()
    keep_labels = valid[valid >= 2].index
    dropped = len(valid) - len(keep_labels)
    if dropped:
        print(f"[WARN] Dropping {dropped} rare categories (<2 samples).")
        combined = combined[combined["Category"].isin(keep_labels)]
    if combined.empty:
        raise RuntimeError("Dataset empty after filtering.")
    return combined


def preprocess_texts(df: pd.DataFrame, processor: TransactionPreprocessor) -> pd.DataFrame:
    df = df.copy()
    df["clean_text"] = processor.clean_batch(df["Description"].tolist())
    return df


def split_dataset(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train_df, temp_df = train_test_split(
        df,
        test_size=0.3,
        random_state=SEED,
        stratify=df["Category"],
    )
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.5,
        random_state=SEED,
        stratify=temp_df["Category"],
    )

    def _ensure_disjoint(a: pd.DataFrame, b: pd.DataFrame, label: str):
        intersection = set(a["Description"]).intersection(b["Description"])
        if intersection:
            raise RuntimeError(f"Duplicate texts found between {label} splits; aborting to avoid leakage.")

    _ensure_disjoint(train_df, val_df, "train/val")
    _ensure_disjoint(train_df, test_df, "train/test")
    _ensure_disjoint(val_df, test_df, "val/test")
    return train_df.reset_index(drop=True), val_df.reset_index(drop=True), test_df.reset_index(drop=True)


def oversample_training(train_df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    ros = RandomOverSampler(random_state=42, sampling_strategy="not majority")
    X_resampled, y_resampled = ros.fit_resample(train_df[["clean_text"]], train_df["Category"])
    return X_resampled["clean_text"].tolist(), y_resampled.tolist()


def evaluate_split(model: TransactionClassifier, df: pd.DataFrame, split_name: str) -> Dict[str, object]:
    clean_texts = df["clean_text"].tolist() if "clean_text" in df.columns else None
    raw_texts = df["Description"].tolist()
    batch_results = model.predict_batch(raw_texts, clean_texts)
    preds = [category for category, _conf, _meta in batch_results]

    report = classification_report(df["Category"], preds, output_dict=True, zero_division=0)
    print(f"\n=== {split_name} Report ===")
    print(classification_report(df["Category"], preds, zero_division=0))

    cm = confusion_matrix(df["Category"], preds, labels=model.get_labels())
    return {
        "macro_f1": report["macro avg"]["f1-score"],
        "weighted_f1": report["weighted avg"]["f1-score"],
        "support": len(df),
        "confusion_matrix": cm.tolist(),
    }


def train():
    _set_seed()
    print("=== Loading datasets ===")
    start_time = time.time()
    df = prepare_dataset()
    load_time = time.time() - start_time

    processor = TransactionPreprocessor()
    print("=== Cleaning text corpus ===")
    preprocess_start = time.time()
    df = preprocess_texts(df, processor)
    preprocess_time = time.time() - preprocess_start

    train_df, val_df, test_df = split_dataset(df)
    print(
        f"[INFO] Split sizes -> train: {len(train_df)} | val: {len(val_df)} | test: {len(test_df)}"
    )

    print("[INFO] Oversampling minority classes within the training split...")
    oversample_start = time.time()
    train_texts, train_labels = oversample_training(train_df)
    oversample_time = time.time() - oversample_start

    classifier = TransactionClassifier()

    print("=== Training DistilBERT head ===")
    train_start = time.time()
    classifier.train(
        texts=train_texts,
        labels=train_labels,
        val_data=(val_df["clean_text"].tolist(), val_df["Category"].tolist()),
        output_dir=str(MODEL_DIR / "classifier_ckpts"),
        epochs=1,
        batch_size=16,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_ratio=0.06,
        logging_steps=100,
        max_length=256,
        use_fp16=torch.cuda.is_available(),
    )
    train_time = time.time() - train_start

    print("=== Saving artifacts ===")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    classifier.save(dir_path=str(MODEL_DIR), name="classifier")

    print("=== Evaluating ===")
    eval_start = time.time()
    metrics = {
        "val": evaluate_split(classifier, val_df, "Validation"),
        "test": evaluate_split(classifier, test_df, "Holdout Test"),
    }
    eval_time = time.time() - eval_start

    metrics["timing"] = {
        "data_loading": load_time,
        "preprocessing": preprocess_time,
        "oversampling": oversample_time,
        "training": train_time,
        "evaluation": eval_time,
        "total": time.time() - start_time,
    }

    metrics_path = MODEL_DIR / "classifier_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as fh:
        json.dump(metrics, fh, indent=2)
    print(f"[INFO] Metrics written to {metrics_path}")
    print("=== Training pipeline completed successfully ===")

def train_with_feedback(feedback_df: Optional[pd.DataFrame] = None):
    """
    Retrain pipeline that accepts an optional feedback DataFrame.
    feedback_df should have columns: ['Description', 'Category']
    """
    _set_seed()
    print("=== Loading base datasets ===")
    start_time = time.time()
    base_df = prepare_dataset()  # loads base training_dataset.xlsx
    load_time = time.time() - start_time

    # If feedback provided, append it (and drop duplicates)
    if feedback_df is not None and not feedback_df.empty:
        # Ensure expected columns
        if "Description" not in feedback_df.columns or "Category" not in feedback_df.columns:
            raise RuntimeError("feedback_df must contain 'Description' and 'Category' columns")
        print(f"[INFO] Appending {len(feedback_df)} feedback rows to base dataset")
        combined = pd.concat([base_df, feedback_df], ignore_index=True)
    else:
        combined = base_df

    # Dedupe and keep dataset consistent
    combined = combined.drop_duplicates(subset=["Description", "Category"]).reset_index(drop=True)

    # Filter rare categories to avoid zero-support classes
    valid = combined["Category"].value_counts()
    keep_labels = valid[valid >= 2].index
    dropped = len(valid) - len(keep_labels)
    if dropped:
        print(f"[WARN] Dropping {dropped} rare categories (<2 samples).")
        combined = combined[combined["Category"].isin(keep_labels)]

    if combined.empty:
        raise RuntimeError("Dataset empty after filtering.")

    # Preprocess text
    processor = TransactionPreprocessor()
    print("=== Cleaning text corpus (including feedback) ===")
    preprocess_start = time.time()
    combined["clean_text"] = processor.clean_batch(combined["Description"].tolist(), max_workers=4)
    preprocess_time = time.time() - preprocess_start

    # Create splits (same as train())
    train_df, val_df, test_df = split_dataset(combined)
    print(f"[INFO] Split sizes -> train: {len(train_df)} | val: {len(val_df)} | test: {len(test_df)}")

    # Oversample training split
    print("[INFO] Oversampling minority classes within the training split...")
    oversample_start = time.time()
    train_texts, train_labels = oversample_training(train_df)
    oversample_time = time.time() - oversample_start

    classifier = TransactionClassifier()

    print("=== Training DistilBERT head (feedback included) ===")
    train_start = time.time()
    classifier.train(
        texts=train_texts,
        labels=train_labels,
        val_data=(val_df["clean_text"].tolist(), val_df["Category"].tolist()),
        output_dir=str(MODEL_DIR / "classifier_ckpts"),
        epochs=1,
        batch_size=16,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_ratio=0.06,
        logging_steps=100,
        max_length=256,
        use_fp16=torch.cuda.is_available(),
    )
    train_time = time.time() - train_start

    # Save model artifacts
    print("=== Saving artifacts ===")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    classifier.save(dir_path=str(MODEL_DIR), name="classifier")

    # Evaluate
    print("=== Evaluating ===")
    eval_start = time.time()
    metrics = {
        "val": evaluate_split(classifier, val_df, "Validation"),
        "test": evaluate_split(classifier, test_df, "Holdout Test"),
    }
    eval_time = time.time() - eval_start

    metrics["timing"] = {
        "data_loading": load_time,
        "preprocessing": preprocess_time,
        "oversampling": oversample_time,
        "training": train_time,
        "evaluation": eval_time,
        "total": time.time() - start_time,
    }

    metrics_path = MODEL_DIR / "classifier_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as fh:
        json.dump(metrics, fh, indent=2)
    print(f"[INFO] Metrics written to {metrics_path}")
    print("=== Retraining pipeline completed successfully ===")

    # Return path to saved model and metrics for callers
    return {"model_dir": str(MODEL_DIR / "classifier"), "metrics_path": str(metrics_path)}


if __name__ == "__main__":
    train()

