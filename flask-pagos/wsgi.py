import sys
import os

# Add /app to Python path so 'payments' package is importable
sys.path.insert(0, '/app')

from payments import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)