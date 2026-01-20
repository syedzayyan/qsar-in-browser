import js
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold
import numpy as np
import joblib

X = (js.globalThis.one_off_mol_fp).to_py()

model = joblib.load("model.pkl")
if js.opts == 1:
    js.one_off_y = model.predict(X)
elif js.opts == 2:
    js.one_off_y = model.predict_proba(X)
else:
    js.one_off_y = None