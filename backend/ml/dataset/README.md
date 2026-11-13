# Educational expense-classifier training data

`transactions_training_data.csv` is a small, hand-curated dataset created for
this B.Tech project. It contains realistic personal-finance transaction titles
and descriptions labelled with one of eight categories:

Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other.

## Important notes

- This is **not** a production financial dataset. It exists to demonstrate a
  complete supervised-learning workflow: text preprocessing, TF-IDF feature
  extraction, train/test splitting, Logistic Regression, and evaluation.
- Labels reflect everyday Indian and general personal-finance wording. Some
  phrases are intentionally ambiguous (for example "gift purchase" vs
  "wedding gift") so the confusion matrix is realistic rather than perfect.
- Rows were written by hand for teaching purposes. No personal or bank data is
  included.
- To extend the dataset, add rows with two columns: `text,category`. Keep the
  category spelling exactly as listed above, then rerun
  `python ml/train_model.py` from the `backend` folder.

## Why this size?

Around 395 examples give every category enough samples for a stratified 80/20
split while training in under a few seconds on a laptop. Accuracy on such a
small curated set is optimistic compared with real bank narration data; the
README and ML documentation discuss this limitation.
