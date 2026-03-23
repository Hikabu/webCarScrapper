import re

def clean(s):
    if isinstance(s, str):
        return re.sub(r'\s+', ' ', s).strip()
    return s