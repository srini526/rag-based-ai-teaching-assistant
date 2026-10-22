import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from embedding import create_embedding
from config import EMBEDDINGS_FILE, TOP_K


# Load embeddings only once when the application starts
df = joblib.load(EMBEDDINGS_FILE)


def retrieve(query):
    """
    Retrieve the most relevant chunks for a query.
    """

    query_embedding = create_embedding([query])[0]

    similarities = cosine_similarity(
        np.vstack(df["embedding"]),
        [query_embedding]
    ).flatten()

    top_indices = similarities.argsort()[::-1][:TOP_K]

    return df.loc[top_indices].copy()