import js
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold
import numpy as np
import joblib

param = {
  "n_estimators": 120,
  "criterion": "poisson",
  "max_features" : None,
}
model = RandomForestRegressor(**param, n_jobs = -1)

X = (js.globalThis.fp).to_py()
y = (js.globalThis.neg_log_activity_column).to_py()

X = np.array(X)
y = np.array(y)

kf = KFold(n_splits=10, shuffle=True)

metrics = []
js_stuff = (js.model_parameters).to_py()

params = None

if js.opts == 1:
  params = {'n_estimators': int(js_stuff['n_estimators']), 
            'criterion': js_stuff['criterion'],
            'max_features': js_stuff['max_features'] if js_stuff['max_features'] != "None" else None, 
            'n_jobs' : int(js_stuff['n_jobs'])}
if js.opts == 2:
    import xgboost
    params = {'max_depth': int(js_stuff['max_depth']), 
            'min_child_weight': js_stuff['min_child_weight'],
            'colsample_bytree': js_stuff['colsample_bytree'], 
            'subsample' : float(js_stuff['subsample']),
            'learning_rate' : float(js_stuff['learning_rate']),
            'n_jobs' : int(js_stuff['n_jobs'])}

per_fold_preds = []
for train, test in kf.split(X, y):
  trainX = X[train]
  trainY = y[train]
  
  testX = X[test]
  testY = y[test]
  

  model = None
  if js.opts == 1:
     model = RandomForestRegressor(**params)
  if js.opts == 2:
     model = xgboost.XGBRegressor(**params)

  model.fit(trainX, trainY)
  pred = model.predict(testX)
  metric = [mean_absolute_error(testY, pred), r2_score(testY, pred)]

  print(metric)
  metrics.append(metric)
  per_fold_preds.append([testY, pred])

js.metrics = metrics
js.perFoldPreds = per_fold_preds

model = None
if js.opts == 1:
    model = RandomForestRegressor(**params)
if js.opts == 2:
    model = xgboost.XGBRegressor(**params)
    
model.fit(X, y)
joblib.dump(model, "model.pkl") 