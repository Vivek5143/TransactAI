# TransactAI – Hybrid Transaction Categorizer

A production-focused transaction classification service that blends deterministic banking heuristics with a fine‑tuned DistilBERT sequence classifier plus a SentenceTransformer embedding fallback. The goal is to keep deployment lightweight (no large LLM APIs) while sustaining high recall on noisy SMS/e-mail banking notifications.

## 🔍 Why DistilBERT?
- **Compact**: ~40 % smaller than BERT-base with comparable accuracy.
- **Fast**: Lower latency, especially when quantized or exported to ONNX.
- **Open**: Fully local fine-tuning; no dependency on closed APIs such as Gemini.

## ✨ Key Features
- Domain-aware text cleaning (`core/preprocessor.py`) tuned for Indian banking language.
- Rule-first inference: deterministic rules (`core/rules.py`) short-circuit obvious classes before invoking the transformer.
- DistilBERT fine-tuning pipeline (`training/train_model.py`) with oversampling + stratified splits.
- SentenceTransformer centroid fallback (`all-MiniLM-L6-v2`) boosts weak ML predictions.
- FastAPI service (`api/main.py`) that loads the saved transformer weights for online inference.

## 🧬 Hybrid Architecture
1. **Rule engine** evaluates both raw and cleaned text. If confidence ≥ 0.9 the decision is returned immediately.
2. **DistilBERT classifier** predicts probabilities with fp16 on CUDA when available. Predictions ≥ 0.7 proceed directly.
3. **SentenceTransformer embeddings** compare the incoming text with per-class centroids saved during training. The cosine score helps rescue borderline cases (<0.7 transformer confidence).
4. **Fusion logic** mixes the three signals; if all stay weak the classifier returns `Others` with low confidence.

## 📁 Project Layout
```
backend/
├── api/                 # FastAPI app + schemas
├── core/                # Preprocessor, fuzzy rules, DistilBERT classifier
├── data/                # Training spreadsheets / CSVs
├── models/              # Saved tokenizer + transformer weights + metrics
└── training/            # Training + evaluation scripts
```

## ⚙️ Environment Setup
```bash
python -m venv venv
venv\Scripts\activate        # or source venv/bin/activate
pip install -r requirements.txt
```
Key dependencies include `torch`, `transformers`, `accelerate`, `scikit-learn`, and `imbalanced-learn`.

## 🧹 Data Preparation
Datasets are configured in `training/train_model.py` (`DATA_SPECS`). Each entry specifies:
- `path`: XLSX/CSV file
- `text_candidates`, `label_candidates`: column fallbacks so heterogeneous sources can be merged.

The `TransactionPreprocessor` converts raw text into normalized tokens (lowercasing, masking numbers, Hinglish normalization, domain entity tags). These cleaned strings become the transformer inputs.

## 🏋️ Training the Transformer
```bash
python -m training.train_model
```
Pipeline summary:
1. Load + merge datasets, drop rare labels, optionally subsample very large corpora.
2. Clean text via `TransactionPreprocessor`.
3. Stratified 70/15/15 split with RandomOverSampler on the training partition.
4. Fine-tune DistilBERT (`core/model.py`) using Hugging Face `Trainer`.
5. Persist artifacts to `models/classifier/` (config, tokenizer, weights, metadata, metrics).

`TransactionClassifier.train` exposes the same knobs used by `training/train_model.py`:
```python
model.train(
    texts=train_texts,
    labels=train_labels,
    val_data=(val_texts, val_labels),
    output_dir="models/classifier_ckpts",
    epochs=3,
    batch_size=16,
    learning_rate=2e-5,
    weight_decay=0.01,
    warmup_ratio=0.06,
    logging_steps=100,
    max_length=256,
    use_fp16=True,
)
```

## 📈 Evaluation
`training/train_model.py` runs `evaluate_split` on validation + holdout sets, printing classification reports and saving summaries to `models/classifier_metrics.json` (macro/weighted F1, support, confusion matrices).

## 🚀 Serving / Inference
```python
from core.model import TransactionClassifier

classifier = TransactionClassifier()
classifier.load(dir_path="models", name="classifier")

text = "Rs. 1,250 debited via UPI to SWIGGY"
category, confidence, meta = classifier.predict(raw_text=text)
print(category, confidence, meta["strategy"])  # Food 0.93 RULE/ML/HYBRID
```
The FastAPI app (`api/main.py`) follows the same pattern and exposes `/classify` and `/feedback` endpoints.

## 🧠 Saving & Loading
- `model.save(dir_path="models", name="classifier")` writes the HF tokenizer/model plus metadata (thresholds, max length, embedder id) and the centroid cache (`label_centroids.pt`).
- `model.load(...)` restores everything so cosine fallback, rules, and thresholds behave exactly as during training.

## ⚡ Performance Tips
- Keep `max_length` tight (128–256) for better throughput.
- Enable `fp16` (default when CUDA is available) or quantize weights via `bitsandbytes`/ONNX Runtime for CPU serving.
- Batch inference requests when possible; tokenizer + transformer accept batched tensors.
- Export to ONNX/TorchScript if you need to embed the model in non-Python runtimes.

## 🧭 Next Steps
- Add monitoring around rule-based fallbacks vs. ML outputs.
- Experiment with multilingual checkpoints if you ingest non-English SMS feeds.
- Consider LoRA fine-tuning to adapt rapidly to new banks or labels.

Happy self-hosting! 🚀

