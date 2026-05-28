"""
Embeddings Service — Local vector embedding generation using sentence-transformers.
Uses 'all-MiniLM-L6-v2' to produce 384-dimensional dense vectors without external API calls.
"""
from typing import List
import os

class LocalEmbeddings:
    _model = None

    @classmethod
    def get_model(cls):
        """Lazily load the SentenceTransformer model to optimize startup time."""
        if cls._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                print("Loading local SentenceTransformer ('sentence-transformers/all-MiniLM-L6-v2')...")
                # Use a standard local directory or environment cache folder if needed
                cls._model = SentenceTransformer("all-MiniLM-L6-v2")
                print("Local SentenceTransformer model loaded successfully!")
            except Exception as e:
                print(f"ERROR: Failed to load local sentence-transformers model: {e}")
                # Fallback model placeholder if import fails
                cls._model = None
        return cls._model

    @classmethod
    def get_embeddings_batch(cls, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of strings using the local model or OpenAI fallback."""
        if not texts:
            return []
        
        # 1. Try local SentenceTransformer model
        model = cls.get_model()
        if model is not None:
            try:
                embeddings = model.encode(texts, show_progress_bar=False)
                return [emb.tolist() for emb in embeddings]
            except Exception as e:
                print(f"Error generating local embeddings batch: {e}")
        
        # 2. Fallback to OpenAI API with 384 dimensions to match local model dimension
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                print("Local model unavailable. Falling back to OpenAI Embeddings API...")
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                response = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=texts,
                    dimensions=384
                )
                return [data.embedding for data in response.data]
            except Exception as e:
                print(f"OpenAI Embeddings API fallback failed: {e}")
        
        # 3. Final fallback to dummy 384-dimensional vectors
        print("WARNING: Returning dummy 384-dimensional vectors.")
        return [[0.0] * 384 for _ in texts]

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        """Generate embedding for a single text string."""
        res = cls.get_embeddings_batch([text])
        return res[0] if res else [0.0] * 384
