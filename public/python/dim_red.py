# dim_red.py - runs in Pyodide
# The script reads variables set from JS:
#   js_fp     - list or array-like of feature vectors
#   js_opts   - integer option selector (1: PCA, 2: PCA->tSNE, 3: tSNE)
#   js_params - dict of parameters (n_components, pca_pre_components, perplexity, n_iter, n_jobs, random_state)

# Import required modules
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import numpy as np

# Convert the JS-provided fp to a numpy array.
# js_fp will arrive as a PyProxy wrapping a list-of-lists; np.array() will handle it.
fp = np.array(js_fp)

# Default parameters (safe fallbacks)
params = js_params.to_py() if js_params is not None else {}
n_components = int(params.get("n_components", 2))
pca_pre_components = int(params.get("pca_pre_components", 30))
perplexity = float(params.get("perplexity", 30.0))
n_iter = int(params.get("n_iter", 1000))
n_jobs = params.get("n_jobs", 1)
random_state = int(params.get("random_state", 42))

# Prepare outputs
pca_result = None           # will hold the 2D embedding (or PCA result)
explained_variance = None   # sum of explained variance ratio (if PCA used)

# Option 1: Normal PCA -> reduce to n_components directly
if int(js_opts) == 1:
    # Create PCA with desired number of components
    pca = PCA(n_components=n_components, random_state=random_state)
    # Fit and transform the fingerprint matrix
    pca_result = pca.fit_transform(fp)
    # Sum of explained variance ratio (how much variance captured by these components)
    explained_variance = float(np.sum(pca.explained_variance_ratio_))

# Option 2: PCA pre-reduction to pca_pre_components, then t-SNE to 2D
elif int(js_opts) == 2:
    # First do a PCA to compress to pca_pre_components (helps t-SNE performance)
    pca_pre = PCA(n_components=min(pca_pre_components, fp.shape[1]), random_state=random_state)
    pca_drugs = pca_pre.fit_transform(fp)
    # Keep explained variance for the PCA step (optional)
    explained_variance = float(np.sum(pca_pre.explained_variance_ratio_))
    # Then run t-SNE on the PCA-reduced data
    tsne = TSNE(n_components=2, random_state=random_state,
                perplexity=perplexity, max_iter=n_iter, n_jobs=n_jobs)
    pca_result = tsne.fit_transform(pca_drugs)

# Option 3: Direct t-SNE on the original features (no PCA pre-step)
elif int(js_opts) == 3:
    tsne = TSNE(n_components=2, random_state=random_state,
                perplexity=perplexity, max_iter=n_iter, n_jobs=n_jobs)
    pca_result = tsne.fit_transform(fp)
    # explained_variance stays None because t-SNE has no explained variance concept

# Fallback: if unknown option, raise a clear error
else:
    raise ValueError(f"Unknown option: {js_opts}. Expected 1 (PCA), 2 (PCA->tSNE), or 3 (tSNE).")

# Expose results to JS by creating Python-level names pyodide can access
# pca_result: numpy array of shape (n_samples, 2) or (n_samples, n_components)
# explained_variance: float or None
# Note: We keep them as Python objects; the worker will convert them to JS.