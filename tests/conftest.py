"""
tests/conftest.py
Configures sys.path to guarantee all tests locate 'backend' and 'ml' modules.
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
