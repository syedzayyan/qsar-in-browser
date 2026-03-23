import js
import numpy as np
import joblib
import io
import base64

from sklearn.model_selection import KFold
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    accuracy_score, roc_auc_score
)

# =========================
# Data
# =========================
X = np.array((js.globalThis.fp).to_py())
y = np.array((js.globalThis.neg_log_activity_column).to_py())

kf = KFold(n_splits=10, shuffle=True)

metrics = []
per_fold_preds = []

js_stuff = (js.model_parameters).to_py()
params = None

# =========================
# Parameter selection
# =========================
if js.opts == 1:  # RF Regressor
    params = {
        'n_estimators': int(js_stuff['n_estimators']),
        'criterion': js_stuff['criterion'],
        'max_features': js_stuff['max_features'] if js_stuff['max_features'] != "None" else None,
        'n_jobs': int(js_stuff['n_jobs'])
    }

if js.opts == 2:  # RF Classifier
    params = {
        'n_estimators': int(js_stuff['n_estimators']),
        'criterion': js_stuff['criterion'],
        'max_features': js_stuff['max_features'] if js_stuff['max_features'] != "None" else None,
        'n_jobs': int(js_stuff['n_jobs'])
    }

if js.opts == 3:  # XGB Regressor
    import xgboost
    params = {
        'max_depth': int(js_stuff['max_depth']),
        'min_child_weight': js_stuff['min_child_weight'],
        'colsample_bytree': js_stuff['colsample_bytree'],
        'subsample': float(js_stuff['subsample']),
        'learning_rate': float(js_stuff['learning_rate']),
        'n_jobs': int(js_stuff['n_jobs'])
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
        'eval_metric': 'logloss'
    }

# =========================
# Cross-validation
# =========================
for train, test in kf.split(X, y):
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
    smiles_list = list(js.globalThis.smiles_list.to_py())
    ids_list    = list(js.globalThis.ids_list.to_py())

    # Inside the fold loop, replace per_fold_preds.append:
    per_fold_preds.append([
        testY.tolist(),
        pred.tolist(),
        [smiles_list[i] for i in test],
        [ids_list[i]    for i in test],
    ])

js.metrics = metrics
js.perFoldPreds = per_fold_preds

# =========================
# Final model
# =========================
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
joblib.dump(model, "./model.pkl")

buf = io.BytesIO()
joblib.dump(model, buf)
model_b64 = base64.b64encode(buf.getvalue()).decode()
js.model_b64 = model_b64