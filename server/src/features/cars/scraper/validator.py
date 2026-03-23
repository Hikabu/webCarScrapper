_unknown = {}

def track_unknown(type_, value):
    if not value or not isinstance(value, str):
        return
    _unknown.setdefault(type_, set()).add(value)

def get_unknowns() -> dict:
    return _unknown

def clear_resolved(resolved: set):
    """Remove only values that were successfully translated."""
    for values in _unknown.values():
        values -= resolved

def clear_unknowns():
    _unknown.clear()

def print_unknowns():
    if not _unknown:
        return
    print("\nUNKNOWN VALUES:")
    for key, s in _unknown.items():
        if s:
            print(f"\n{key.upper()}:")
            print(list(s))