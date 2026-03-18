import numpy as np
import pytest

from retrieval import search as search_module


# ---- Fake FAISS index ----
class FakeIndex:
    def __init__(self, scores, indices):
        self._scores = np.array([scores], dtype="float32")
        self._indices = np.array([indices], dtype="int64")

    def search(self, query_vector, k):
        return self._scores, self._indices


# ---- Fixtures ----
@pytest.fixture
def fake_metadata():
    return [
        {
            "chunk_id": "c1",
            "doc_id": "d1",
            "category": "services",
            "title": "Local SEO Services",
            "section_title": "Overview",
            "filepath": "services/local-seo.md",
            "text": "We provide local SEO services"
        },
        {
            "chunk_id": "c2",
            "doc_id": "d2",
            "category": "pricing_policies",
            "title": "Onboarding Discounts",
            "section_title": "Discounts",
            "filepath": "pricing/onboarding.md",
            "text": "Discounts for new clients"
        },
    ]


@pytest.fixture
def fake_embed(monkeypatch):
    def mock_post(url, json):
        class Response:
            def raise_for_status(self): pass
            def json(self):
                return {"embedding": [0.1, 0.2, 0.3]}
        return Response()

    monkeypatch.setattr(search_module.requests, "post", mock_post)


@pytest.fixture
def fake_loader(monkeypatch, fake_metadata):
    fake_index = FakeIndex(
        scores=[0.9, 0.8],
        indices=[0, 1]
    )

    def mock_read_index(path):
        return fake_index

    def mock_pickle_load(f):
        return fake_metadata

    monkeypatch.setattr(search_module.faiss, "read_index", mock_read_index)
    monkeypatch.setattr(search_module.pickle, "load", mock_pickle_load)


# ---- Tests ----

def test_search_basic(fake_embed, fake_loader):
    results = search_module.search("local seo services", k=2)

    assert len(results) == 2
    assert results[0]["chunk_id"] == "c1"
    assert results[1]["chunk_id"] == "c2"


def test_search_skips_negative_indices(monkeypatch, fake_embed, fake_metadata):
    fake_index = FakeIndex(
        scores=[0.9, 0.5],
        indices=[0, -1]
    )

    monkeypatch.setattr(search_module.faiss, "read_index", lambda _: fake_index)
    monkeypatch.setattr(search_module.pickle, "load", lambda _: fake_metadata)

    results = search_module.search("anything", k=2)

    assert len(results) == 1
    assert results[0]["chunk_id"] == "c1"


def test_search_empty_results(monkeypatch, fake_embed, fake_metadata):
    fake_index = FakeIndex(
        scores=[0.0, 0.0],
        indices=[-1, -1]
    )

    monkeypatch.setattr(search_module.faiss, "read_index", lambda _: fake_index)
    monkeypatch.setattr(search_module.pickle, "load", lambda _: fake_metadata)

    results = search_module.search("nothing", k=2)

    assert results == []


def test_search_output_structure(fake_embed, fake_loader):
    results = search_module.search("test", k=1)

    result = results[0]

    expected_keys = {
        "score",
        "chunk_id",
        "doc_id",
        "category",
        "title",
        "section_title",
        "filepath",
        "text",
    }

    assert set(result.keys()) == expected_keys


def test_embed_called(monkeypatch, fake_loader):
    called = {"count": 0}

    def mock_post(url, json):
        called["count"] += 1

        class Response:
            def raise_for_status(self): pass
            def json(self):
                return {"embedding": [0.1, 0.2, 0.3]}
        return Response()

    monkeypatch.setattr(search_module.requests, "post", mock_post)

    search_module.search("test", k=1)

    assert called["count"] == 1