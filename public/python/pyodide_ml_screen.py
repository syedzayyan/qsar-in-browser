import js
import joblib
import numpy as np

try:
    X = np.array(js.globalThis.one_off_mol_fp.to_py())
    model = joblib.load("./model.pkl")

    if js.opts in (1, 3):
        js.one_off_y = model.predict(X).tolist()
    elif js.opts in (2, 4):
        js.one_off_y = model.predict_proba(X).tolist()
    else:
        raise ValueError(f"Unknown opts value: {js.opts}")
except FileNotFoundError as e:
    print(f"Model file not found: {e}")
    js.one_off_y = None
except ValueError as e:
    print(f"Value error: {e}")
    js.one_off_y = None
except Exception as e:
    print(f"Unexpected error: {e}")
    js.one_off_y = None