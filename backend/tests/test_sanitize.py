import pytest
from backend.src.sanitize.sanitize import normalize_whitespace, clean_html, clip

def test_normalize_whitespace_trims_and_collapses():
    """Tests trimming of ends and collapsing of internal spaces/tabs."""
    input_str = "  Leading and \t\t\t internal spaces   "
    expected_str = "Leading and internal spaces"
    assert normalize_whitespace(input_str) == expected_str

def test_normalize_whitespace_empty_string():
    """Tests handling of an empty string."""
    assert normalize_whitespace("") == ""

def test_clean_html_removes_tags():
    """Tests basic removal of HTML tags."""
    input_str = "This is <b>bold</b> text and <br> a line break."
    expected_str = "This is bold text and a line break."
    assert clean_html(input_str) == expected_str

def test_clip_truncates_long_string():
    """Tests truncation to the maximum length."""
    long_str = "A" * 105
    max_len = 100
    assert len(clip(long_str, max_len)) == max_len
    assert clip(long_str, max_len) == "A" * 100

def test_clip_does_not_truncate_short_string():
    """Tests that a short string is returned untouched."""
    short_str = "Short"
    max_len = 100
    assert clip(short_str, max_len) == short_str