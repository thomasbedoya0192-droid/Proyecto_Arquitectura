#!/bin/bash
export PYTHONPATH=/app
exec gunicorn payments.wsgi:app --bind 0.0.0.0:5000 --workers 2