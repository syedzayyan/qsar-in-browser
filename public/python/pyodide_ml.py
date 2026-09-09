import json
import time

import js
from js import Object
from pyodide.ffi import to_js
import numpy as np
import joblib

from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score
from sklearn.base import clone
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    accuracy_score, roc_auc_score
)
from scipy.stats import randint, uniform, loguniform

RANDOM_STATE = 42
REQUEST_ID = getattr(js, "request_id", None)


def report_progress(stage, current, total, start_time):
    """Posts a { id, message } ping back to the main thread so the UI can
    show what's running and roughly how long is left, instead of going
    silent for the whole training run."""
    elapsed = time.time() - start_time
    avg_per_step = elapsed / current if current > 0 else 0
    remaining = avg_per_step * (total - current)
    eta = f" (~{int(remaining)}s left)" if 0 < current < total and remaining > 1 else ""
    text = f"{stage}: {current}/{total}{eta}"
    payload = to_js({"id": REQUEST_ID, "message": text}, dict_converter=Object.fromEntries)
    js.postMessage(payload)


# =========================
# Data
# =========================
X = np.array((js.globalThis.fp).to_py())
y = np.array((js.globalThis.neg_log_activity_column).to_py())

js_stuff = (js.model_parameters).to_py()
is_classification = js.opts in (2, 4)

# QSAR activity classification is very often imbalanced (far more inactives
# than actives, or vice versa) - leaving class weights at their defaults lets
# the model just learn to predict the majority class. scale_pos_weight is
# XGBoost's equivalent of sklearn's class_weight='balanced' for binary tasks.
scale_pos_weight = 1.0
if is_classification:
    n_pos = int(y.sum())
    n_neg = len(y) - n_pos
    if n_pos > 0 and n_neg > 0:
        scale_pos_weight = n_neg / n_pos

# A fixed 10 folds means a small QSAR dataset (a very common case here) gets
# tiny test folds - e.g. 40 compounds -> ~4 per fold - and R2/MAE computed on
# a handful of points is extremely noisy (one off prediction can swing R2
# deeply negative even for a genuinely reasonable model). Scaling fold count
# down for small datasets (floor of ~8 samples/fold, 3-10 folds) keeps each
# fold's metric meaningful instead of just reporting noise.
n_splits = min(10, max(3, len(X) // 8))

# Stratifying keeps each fold's class balance close to the full dataset's -
# plain KFold ignores y entirely, so on an imbalanced or small dataset a fold
# can end up with almost no positives, making metrics wildly unstable.
if is_classification:
    kf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)
else:
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)

metrics = []
per_fold_preds = []

params = None

# =========================
# Parameter selection
# =========================
if js.opts == 1:  # RF Regressor
    params = {
        'n_estimators': int(js_stuff['n_estimators']),
        'criterion': js_stuff['criterion'],
        'max_features': js_stuff['max_features'] if js_stuff['max_features'] != "None" else None,
        'n_jobs': int(js_stuff['n_jobs']),
        'random_state': RANDOM_STATE,
    }

if js.opts == 2:  # RF Classifier
    params = {
        'n_estimators': int(js_stuff['n_estimators']),
        'criterion': js_stuff['criterion'],
        'max_features': js_stuff['max_features'] if js_stuff['max_features'] != "None" else None,
        'n_jobs': int(js_stuff['n_jobs']),
        'random_state': RANDOM_STATE,
        'class_weight': 'balanced',
    }

if js.opts == 3:  # XGB Regressor
    import xgboost
    params = {
        'max_depth': int(js_stuff['max_depth']),
        'min_child_weight': js_stuff['min_child_weight'],
        'colsample_bytree': js_stuff['colsample_bytree'],
        'subsample': float(js_stuff['subsample']),
        'learning_rate': float(js_stuff['learning_rate']),
        'n_jobs': int(js_stuff['n_jobs']),
        'random_state': RANDOM_STATE,
    }

if js.opts == 4:  # XGB Classifier
    import xgboost
    params = {
        'max_depth': int(js_stuff['max_depth']),
        'min_child_weight': js_stuff['min_child_weight'],
        'colsample_bytree': js_stuff['colsample_bytree'],
        'subsample': float(js_stuff['subsample']),
        'learning_rate': float(js_stuff['learning_rate']),
        'n_jobs': int(js_stuff['n_jobs']),
        'use_label_encoder': False,
        'eval_metric': 'logloss',
        'random_state': RANDOM_STATE,
        'scale_pos_weight': scale_pos_weight,
    }

# =========================
# Optional randomized hyperparameter search
# =========================
# A full grid search blows up combinatorially and this all runs on a single
# WASM thread, so trying a fixed number of random combinations (rather than
# every one) is the browser-friendly option. This is hand-rolled instead of
# sklearn's RandomizedSearchCV so progress can be reported after each trial -
# the search uses its own inner CV, separate from the outer 10-fold loop
# below, which still evaluates + reports on whatever parameters end up in
# `params` (searched or user-supplied).
best_params_found = None
use_random_search = bool(js_stuff.get('use_random_search'))

if use_random_search:
    n_iter = int(js_stuff.get('n_iter') or 20)
    inner_splits = min(5, n_splits)
    inner_cv = (
        StratifiedKFold(n_splits=inner_splits, shuffle=True, random_state=RANDOM_STATE)
        if is_classification
        else KFold(n_splits=inner_splits, shuffle=True, random_state=RANDOM_STATE)
    )

    base_estimator = None
    param_distributions = None
    scoring = None

    if js.opts == 1:  # RF Regressor
        base_estimator = RandomForestRegressor(n_jobs=params['n_jobs'], random_state=RANDOM_STATE)
        param_distributions = {
            'n_estimators': randint(50, 400),
            'max_depth': [None, 5, 10, 15, 20, 30],
            'max_features': ['sqrt', 'log2', None],
            'min_samples_split': randint(2, 10),
            'min_samples_leaf': randint(1, 5),
        }
        scoring = 'r2'

    if js.opts == 2:  # RF Classifier
        base_estimator = RandomForestClassifier(
            n_jobs=params['n_jobs'], random_state=RANDOM_STATE, class_weight='balanced',
        )
        param_distributions = {
            'n_estimators': randint(50, 400),
            'max_depth': [None, 5, 10, 15, 20, 30],
            'max_features': ['sqrt', 'log2', None],
            'min_samples_split': randint(2, 10),
            'min_samples_leaf': randint(1, 5),
        }
        scoring = 'roc_auc'

    if js.opts == 3:  # XGB Regressor
        import xgboost
        base_estimator = xgboost.XGBRegressor(n_jobs=params['n_jobs'], random_state=RANDOM_STATE)
        param_distributions = {
            'n_estimators': randint(50, 400),
            'max_depth': randint(3, 12),
            'min_child_weight': randint(1, 10),
            'subsample': uniform(0.6, 0.4),
            'colsample_bytree': uniform(0.6, 0.4),
            'learning_rate': loguniform(0.01, 0.3),
        }
        scoring = 'r2'

    if js.opts == 4:  # XGB Classifier
        import xgboost
        base_estimator = xgboost.XGBClassifier(
            n_jobs=params['n_jobs'], random_state=RANDOM_STATE,
            use_label_encoder=False, eval_metric='logloss',
            scale_pos_weight=scale_pos_weight,
        )
        param_distributions = {
            'n_estimators': randint(50, 400),
            'max_depth': randint(3, 12),
            'min_child_weight': randint(1, 10),
            'subsample': uniform(0.6, 0.4),
            'colsample_bytree': uniform(0.6, 0.4),
            'learning_rate': loguniform(0.01, 0.3),
        }
        scoring = 'roc_auc'

    rng = np.random.RandomState(RANDOM_STATE)
    best_score = -np.inf
    search_start = time.time()

    for i in range(n_iter):
        trial_params = {}
        for key, dist in param_distributions.items():
            if hasattr(dist, 'rvs'):
                trial_params[key] = dist.rvs(random_state=rng)
            else:
                trial_params[key] = dist[rng.randint(0, len(dist))]

        trial_estimator = clone(base_estimator).set_params(**trial_params)
        scores = cross_val_score(trial_estimator, X, y, cv=inner_cv, scoring=scoring, n_jobs=1)
        mean_score = scores.mean()

        if mean_score > best_score:
            best_score = mean_score
            best_params_found = trial_params

        report_progress("Randomized search", i + 1, n_iter, search_start)

    # Fold the search's winning params into the ones used below, keeping
    # anything the search doesn't touch (n_jobs, random_state, criterion, ...).
    params = {**params, **best_params_found}

js.bestParams = json.dumps(best_params_found, default=str) if best_params_found else None

# =========================
# Cross-validation
# =========================
split_target = y if is_classification else None
cv_start = time.time()
fold_total = kf.get_n_splits()

for fold_idx, (train, test) in enumerate(kf.split(X, split_target)):
    trainX, trainY = X[train], y[train]
    testX, testY = X[test], y[test]

    model = None

    if js.opts == 1:
        model = RandomForestRegressor(**params)
    if js.opts == 2:
        model = RandomForestClassifier(**params)
    if js.opts == 3:
        model = xgboost.XGBRegressor(**params)
    if js.opts == 4:
        model = xgboost.XGBClassifier(**params)

    model.fit(trainX, trainY)
    pred = model.predict(testX)

    # =====================
    # Metrics
    # =====================
    if js.opts in [1, 3]:  # regression
        metric = [
            mean_absolute_error(testY, pred),
            r2_score(testY, pred)
        ]
    else:  # classification
        prob = model.predict_proba(testX)[:, 1] if hasattr(model, "predict_proba") else pred
        metric = [
            accuracy_score(testY, pred),
            roc_auc_score(testY, prob)
        ]

    print(metric)
    metrics.append(metric)
    per_fold_preds.append([testY, pred])

    report_progress("Cross-validation", fold_idx + 1, fold_total, cv_start)

js.metrics = metrics
js.perFoldPreds = per_fold_preds

# =========================
# Final model
# =========================
payload = to_js(
    {"id": REQUEST_ID, "message": "Training final model on full dataset..."},
    dict_converter=Object.fromEntries,
)
js.postMessage(payload)

model = None
if js.opts == 1:
    model = RandomForestRegressor(**params)
if js.opts == 2:
    model = RandomForestClassifier(**params)
if js.opts == 3:
    model = xgboost.XGBRegressor(**params)
if js.opts == 4:
    model = xgboost.XGBClassifier(**params)

model.fit(X, y)
joblib.dump(model, "model.pkl")
