import js
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold
import numpy as np
import joblib

X = (js.globalThis.one_off_mol_fp).to_py()

model = joblib.load("model.pkl")
js.one_off_y = model.predict(X)