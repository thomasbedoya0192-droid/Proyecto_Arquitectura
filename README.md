# Proyecto_Arquitectura - Deliverable 2

## Microservices Migration, Integration, and Resilience
### Software Architecture 2026-1

---

## 1. Overview & Architecture

### Summary
**Proyecto_Arquitectura** is a software architecture project that demonstrates the migration of a legacy Django monolith into a hybrid microservices ecosystem using the **Strangler Fig Pattern**. The system implements a modular approach where components are incrementally extracted from the monolith into independent Flask microservices, all routed through an Nginx API Gateway. The project integrates asynchronous processing via Celery & Redis, third-party API consumption through the Adapter Pattern, and full internationalization (i18n) support for bilingual (Spanish/English) UI.

### Business Domain
FinancEZ is a financial management platform that enables users to manage bank accounts, subscriptions, savings goals, and transactions. The system provides account management, recurring payment processing, premium plan upgrades, and financial analytics with AI-generated feedback.

### Architectural Description
The system follows a **Hybrid Ecosystem** pattern:

- **Legacy Monolith (Django)**: Contains the core business logic, database models, and admin interface. Currently serves as the primary API and admin backend.
- **Microservices (Flask)**: The `flask-pagos` microservice handles payment-specific functionality (payment processing, premium subscription management) in isolation.
- **Strangler Fig Pattern**: New features and extracted domains are routed to Flask microservices while legacy Django components continue handling existing functionality. Over time, more components will be migrated.
- **API Gateway (Nginx)**: Routes incoming client requests to the appropriate backend service (Django API or Flask microservices) based on URL paths and headers.
- **Async Processing**: Background tasks, notifications, and reports are handled by Celery workers with Redis as the message broker.
- **Database**: PostgreSQL is used for both the core Django database and the payments Flask service, each in isolated containers.

### Component Layout Diagram

```
+----------------------+       +----------------------+       +----------------------+
|   Client / Browser   | <-->  |    Nginx Gateway     | <-->  |   Django API (Core)  |
|  (React + i18n)      |       |  Port 80 / 443       |       |  Port 8000           |
+----------------------+       +----------------------+       +----------------------+
          |                            |                             |
          |          +-----------------+-----------------+             |
          |          |                                 |             |
          v          v                                   v             v
+----------------------+   +----------------------+   +----------------------+
|   Flask Microservice |   |   PostgreSQL (Core) |   |   Redis / Celery     |
|   (payments-service) |   |   Port 5432         |   |   Broker Port 6379   |
+----------------------+   +----------------------+   +----------------------+
          |                            |
          |          +-----------------+-----------------+
          +-->|  PostgreSQL (payments)   | Port 5432
              |  Port 5432             |
              +--------------------------

Key Flow:
1. Client requests -> Nginx Gateway -> Django API (or Flask if Strangler route)
2. Django API uses PostgreSQL for core data
3. Flask microservice uses separate PostgreSQL for payments data
4. Celery workers (via Redis) handle async tasks: email notifications, report generation, autodebit processing
5. LLM calls via Groq API for AI-powered financial feedback
```

---

## 2. Tech Stack & Tools

| Category | Technologies |
|----------|------------|
| **Languages** | Python 3.14+, JavaScript, HTML/CSS |
| **Frameworks** | Django 6.1, Flask 2.3, React 19, Vite, Gunicorn |
| **Infrastructure** | Docker, Docker Compose, Nginx, AWS EC2 (AWS Academy) |
| **Messaging & Async** | Redis 7, Celery 5, PostgreSQL 15 |
| **API & Auth** | Django REST Framework, JWT (HS256), Simple JWT, CORS Headers |
| **i18n** | Django `gettext`, Flask-Babel, i18next (React) |
| **Design Patterns** | Strangler Fig, Adapter, Dependency Inversion |
| **Third-Party Services** | Groq LLM API, PostgreSQL |

---

## 3. Key Features & Design Patterns

### Strangler Pattern
Modular service migration strategy that gradually extracts functionality from the Django monolith into independent Flask microservices. New routes are redirected to microservices while legacy endpoints remain in Django, allowing zero-downtime migration.

### Adapter Pattern
Third-party API consumption is isolated via an adapter module that adheres to the **Dependency Inversion Principle**. The adapter provides a clean interface for consuming external services (e.g., allied team APIs) without coupling the core business logic to external implementations.

### Asynchronous Task Queue
Celery & Redis power the background job system for:
- Email notifications and reports
- AI-powered financial feedback generation via LLM
- Scheduled subscription autodebit processing
- Non-blocking operations across both Django and Flask services

### Internationalization (i18n)
Full bilingual support using:
- **Django**: `gettext_lazy` for server-side strings (`locale/django/`)
- **Flask**: Flask-Babel for microservice translations
- **React**: i18next with `react-i18next` client-side (`frontend/src/i18n/`)
- Languages: Spanish (`es`) and English (`en`)

---

## 4. API Endpoints & Integration

### Exposed JSON API Specification (Django REST Framework)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/` | GET | Health check endpoint |
| `/api/cuentas/` | GET/POST | List/create bank accounts |
| `/api/cuentas/<int:pk>/` | GET/PUT/DELETE | Account details |
| `/api/suscripciones/` | GET/POST | List/create subscriptions |
| `/api/suscripciones/<int:pk>/` | GET/PUT/DELETE | Subscription details |
| `/api/suscripciones/procesar-autodebitos/` | POST | Process automatic subscription debits |
| `/api/metas/` | GET/POST | List/create savings goals |
| `/api/metas/<int:pk>/abonar/` | POST | Credit/debit savings goal |
| `/api/auth/login/` | POST | JWT login (issues access/refresh tokens) |
| `/api/auth/token/refresh/` | POST | Refresh JWT access token |
| `/api/feedback/access-check/` | GET | Check premium access for feedback |

### Allied Team API Integration
- Integrated Consumed Service: The system consumes an external API provided by an allied team for enriched financial data.
- Integration is handled through a dedicated module that transforms and caches third-party responses.
- Authentication uses shared JWT secrets between Django and Flask services.

### Third-Party API Consumption (via Adapter)
- **Adapter Module**: Isolated class that consumes the third-party API and maps responses to internal domain models.
- **Dependency Inversion**: The core business logic depends on an abstract interface, not the concrete third-party implementation.
- The adapter is instantiated via dependency injection, allowing mocking in tests and swapping providers without affecting business logic.
- LLM integration (Groq API) for AI-powered financial feedback generation follows the same pattern.

---

## 5. Prerequisites & Environment Setup

### System Requirements
- **Docker Engine**: v20.10+
- **Docker Compose**: v2.0+
- **Git**: For repository cloning
- **SSH Keys**: For repository access (GitHub SSH)
- **AWS EC2 CLI**: Optional for cloud deployment

### `.env` File Configuration Template
Copy `.env.example` to `.env` and fill in the required variables:

```bash
cp .env.example .env
```

**Required Environment Variables** (from `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `django-insecure-dev-key-change-in-production` |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `JWT_SECRET_KEY` | Shared JWT signing key | `change-this-to-a-super-secret-jwt-key` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Token lifetime (seconds) | `1200` |
| `LLM_PROVIDER` | LLM provider (`groq` or `openai`) | `groq` |
| `LLM_API_KEY` | API key for LLM service | `gsk_your_groq_api_key_here` |
| `LLM_MODEL` | Model name (Groq) | `openai/gpt-oss-20b` |
| `INTERNAL_SERVICE_TOKEN` | Internal service token | `change-this-to-a-secret-internal-token` |
| `GATEWAY_PORT` | Gateway port (Nginx) | `80` |
| `PREMIUM_PRICE` | Premium plan price | `9.99` |
| `PREMIUM_PERIOD_DAYS` | Premium period (days) | `30` |

**Database Credentials** (auto-configured by Docker Compose):
- Core DB: `core_user` / `core_pass` / `core`
- Payments DB: `payments_user` / `payments_pass` / `payments`

---

## 6. Deployment & Execution Guide

### Clone the Repository (SSH)
```bash
git clone git@github.com:thomasbedoya0192-droid/Proyecto_Arquitectura.git
cd Proyecto_Arquitectura
```

### Build and Run the Orchestration Stack

**Local Development & AWS EC2:**
```bash
docker compose up --build -d
```

This will start all services:
- Nginx Gateway (port 80)
- Django API (port 8000 internally)
- Flask Payments Microservice (port 5000 internally)
- PostgreSQL (core & payments databases)
- Redis & Celery broker
- React frontend (served via Nginx)

### Database Migrations Execution

**Django Core Migrations:**
```bash
docker exec django-api python manage.py migrate
```

**Flask Payments Migrations:**
```bash
docker exec celery-worker celery -A core migrate  # or use Flask-Migrate
# Alternatively, enter the Flask container:
docker exec -it flask-pagos bash
cd /app/payments
flask db init  # if not already initialized
flask db migrate
flask db upgrade
```

### Celery Worker Startup

```bash
# Workers are already defined in docker-compose.yml
# To start manually (outside Docker):
docker compose up celery-worker -d

# To view Celery worker logs:
docker compose logs celery-worker

# To run a one-off Celery task:
docker compose exec celery-worker celery -A core task_name --loglevel=info
```

### Additional Service Management

```bash
# Stop all services
docker compose down

# Restart specific service
docker compose restart django-api

# View service logs
docker compose logs -f django-api

# Enter Django container shell
docker exec -it django-api bash

# Enter Flask container shell
docker exec -it flask-pagos bash

# View all running containers
docker compose ps
```

---

## 7. Directory & Project Structure

```
/Proyecto_Arquitectura/
├── .dockerignore          # Docker build ignore rules
├── .env.example            # Environment variables template
├── .gitignore            # Git ignore rules
├── Dockerfile            # Base Docker image for Django
├── docker-compose.yml    # Orchestration stack (all services)
├── gateway/              # Nginx API Gateway
│   ├── Dockerfile        # Multi-stage build (Node build + Nginx)
│   └── nginx.conf        # Reverse proxy routing config
│   └── routes/public.py  # Public route definitions
├── flask-pagos/          # Flask Microservice (payments)
│   ├── Dockerfile        # Python 3.12 slim image
│   ├── entrypoint.py     # Application entry point
│   ├── entrypoint.sh     # Shell entrypoint
│   └── payments/         # Flask application code
│       ├── __init__.py   # App factory (create_app)
│       ├── config.py     # Configuration from env vars
│       ├── extensions.py # SQLAlchemy, Migrate, Babel init
│       ├── models.py     # Payment models (Wallet, Subscription, etc.)
│       ├── routes/       # Flask routes
│       │   └── public.py # Public health endpoints
│       └── translations/ # i18n message files
├── core/                 # Django Project (Legacy Monolith)
│   ├── __init__.py
│   ├── settings.py       # Django settings (i18n, JWT, DB config)
│   ├── urls.py           # Main URL routing
│   ├── wsgi.py           # WSGI entry point
│   └── manage.py         # Django CLI
├── app/                  # Django Core Application
│   ├── models.py         # CuentaBancaria, Suscripcion, MetaAhorro, etc.
│   ├── views.py          # DRF API Views
│   ├── services.py       # Business logic (autodebit processing)
│   ├── ia/               # AI/LLM services
│   │   ├── services.py   # FeedbackIAService, LLMClient
│   │   ├── prompts.py    # Prompt templates for LLM
│   │   └── views.py      # IA feedback endpoints
│   ├── services.py       # Core business services
│   ├── urls.py           # App URL patterns
│   └── management/       # Custom Django management commands
├── transacciones/        # Django Transaction App
│   ├── models.py         # Transaccion model
│   ├── domain/           # Domain layer
│   ├── infra/            # Infrastructure layer
│   ├── views.py          # Transaction API Views
│   └── urls.py           # Transaction URL patterns
├── billing/              # Billing & Subscription App
│   ├── models.py         # Wallet, Subscription, TestCard, PaymentHistory
│   ├── urls.py           # Billing URL patterns
│   └── permissions.py    # IsPremium permission class
├── frontend/             # React SPA (i18n-enabled)
│   ├── Dockerfile        # Nginx + Node multi-stage build
│   ├── package.json      # Dependencies (React, i18next, Axios)
│   ├── src/              # Source code
│   │   ├── main.jsx      # App entry with I18nextProvider
│   │   ├── App.jsx       # Main routes + LanguageSelector
│   │   ├── api.js        # Axios API client
│   │   └── components/   # React components
│   └── vite.config.js    # Vite build config
├── locale/               # Django gettext translations
│   └── django/           # Django message files (.po, .mo)
├── requirements.txt      # Python dependencies (Django stack)
├── package.json          # Frontend dependencies
├── package-lock.json     # Locked frontend dependencies
```

---