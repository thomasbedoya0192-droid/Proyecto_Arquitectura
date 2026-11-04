# FinancEZ — Personal Finance Manager

Full-stack web application to manage personal finances: bank accounts, income and expenses, transfers, recurring subscriptions with auto-debit, savings goals, financial reports and AI-generated feedback.

* **Backend:** Django 6.1.1 + Django REST Framework 3.18.1
* **Frontend:** React 19 + Vite 8.3 (React Router, Axios, Lucide React)
* **Database:** SQLite (development)
* **AI feedback:** implemented inside the Django backend (`app/ia`), which calls an external LLM provider (Groq by default, or OpenAI) over HTTPS.

---

## Project Structure

```
├── app/                        # Accounts, subscriptions, savings goals and FeedbackIA model
│   ├── ia/                     # AI feedback: LLMClient, FeedbackIAService, prompts, views, urls
│   └── management/commands/
│       └── generar_feedback_semanal.py
├── transacciones/              # Transactions, reports, transfers and user login/registration
│   ├── services.py             # TransaccionService (business rules)
│   ├── domain/                 # Reserved for future domain entities (currently empty)
│   └── infra/                  # Reserved for future repositories (currently empty)
├── core/                       # Django project settings and root URLs
├── frontend/                   # React + Vite SPA
│   └── src/                    # App.jsx, api.js, components/
├── docs/diagrams/              # Deployment, component and data-model diagrams (.drawio + .svg)
├── requirements.txt            # Python dependencies
└── wiki_030.md                 # Deliverable 3 (MVP) wiki content
```

---

## Technologies

| Layer | Stack |
|-------|-------|
| Language | Python 3.12+ (required by Django 6.1), JavaScript (ES modules) |
| Backend | Django 6.1.1, Django REST Framework 3.18.1, requests 2.34.2, python-dotenv 1.2.4 |
| Frontend | React 19, Vite 8.3, React Router DOM 7, Axios 1.20, Lucide React 1.47 |
| Database | SQLite 3 (embedded, via Python's `sqlite3` module) |
| Tooling | ESLint (frontend) |

---

## Prerequisites

* Python **3.12 or higher** and `pip`
* Node.js **20.19+ or 22.12+** and `npm` (required by Vite 8)

---

## Getting Started

### 1. Clone the repository and create the virtual environment

```bash
git clone https://github.com/Eder-Ceballos/P1.git
cd P1
git checkout feature/ia-implementation

python -m venv venv

# Linux / macOS
source venv/bin/activate
# Windows (CMD)
venv\Scripts\activate.bat
# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

### 2. Install the backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure the environment variables

Create a file named `.env` in the project root (it is loaded automatically and is ignored by git):

```env
LLM_API_KEY=your_api_key_here
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_API_KEY` | Only for AI feedback | — | API key of the LLM provider. Without it the application still works, but AI feedback is not generated. |
| `LLM_PROVIDER` | No | `groq` | `groq` or `openai`. |
| `LLM_MODEL` | No | `llama-3.3-70b-versatile` | Model name sent to the provider. When using `openai`, set it explicitly (for example `gpt-4o`), because the default is a Groq model. |

### 4. Create the database

```bash
python manage.py migrate
```

Optional: create an administrator for the Django admin panel (`/admin/`):

```bash
python manage.py createsuperuser
```

### 5. Run the backend

```bash
python manage.py runserver
```

The API is available at **http://127.0.0.1:8000/api/**.

### 6. Run the frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

The SPA is served at **http://localhost:5173/**. Vite proxies every request starting with `/api` to `http://127.0.0.1:8000`, so the backend must be running.

---

## Management Command: Weekly AI Feedback

`generar_feedback_semanal` generates the AI feedback (6 sections) for users.

```bash
# All users that have at least one account (skips users updated in the last 7 days)
python manage.py generar_feedback_semanal

# Only one user
python manage.py generar_feedback_semanal --usuario-id 1

# Regenerate even if the feedback was updated in the last 7 days
python manage.py generar_feedback_semanal --force
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `--usuario-id` | integer | Generate feedback only for the user with that id. |
| `--force` | flag | Ignore the 7-day window and regenerate. |

The command is not scheduled automatically; run it manually or schedule it with `cron` / Windows Task Scheduler. It requires `LLM_API_KEY`.

Besides the weekly command, feedback is also generated when a savings goal is created or completed, when a subscription is created, when a large expense is recorded, or manually from the **Feedback** page.

---

## Backend API

All paths are prefixed with `/api/`.

### Users

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/transacciones/registrar-usuario/` | `nombre` | Creates a user. Fails with 400 if the name already exists. |
| POST | `/transacciones/login-usuario/` | `nombre` | Name-only login (no password). Returns `id`, `nombre`, `username`. 404 if the user does not exist. |

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cuentas/?usuario=<id>` | Lists accounts; `usuario` is optional and filters by user. |
| POST | `/cuentas/registrar/` | Creates an account (`usuario`, `nombre`, `tipo`, `saldo`, `tope_gasto_mensual`). |
| GET / PUT / DELETE | `/cuentas/<id>/` | Retrieves, partially updates or deletes an account (deleting also removes its transactions). |

### Transactions and reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/transacciones/?usuario=<id>&cuenta=<id>&tipo=<tipo>` | History. `usuario` or `cuenta` is required; `tipo` is optional. |
| POST | `/transacciones/registrar/` | Registers an income or expense: `usuario`, `cuenta`, `monto`, `tipo` (`ingreso` / `gasto`), `descripcion`. An expense that exceeds the free balance (but not the real balance) takes the excess from savings goals and returns an `alerta_meta`; an expense above the real balance is rejected with 400. |
| GET / DELETE | `/transacciones/<id>/` | Retrieves or deletes a transaction (the account balance is adjusted). |
| GET | `/transacciones/reporte/?usuario=<id>&cuenta=<id>` | Financial report. `usuario` is required; `cuenta` is optional. |
| POST | `/transacciones/transferir/` | Atomic transfer between two accounts of the same user: `usuario`, `cuenta_origen`, `cuenta_destino`, `monto`, `descripcion`. |

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/suscripciones/?usuario=<id>&cuenta=<id>` | Lists subscriptions. `usuario` or `cuenta` is required. |
| POST | `/suscripciones/` | Creates a subscription. |
| PUT / DELETE | `/suscripciones/<id>/` | Updates or deletes a subscription. |
| POST | `/suscripciones/procesar-autodebitos/` | Processes the due auto-debits of a user (`usuario`). |

### Savings goals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/metas/?usuario=<id>` | Lists the goals of a user. |
| POST | `/metas/` | Creates a goal. |
| POST | `/metas/<id>/abonar/` | Adds or releases funds: `monto`, `accion` (`abonar` / `liberar`). Cannot exceed the account's free balance. |

### AI feedback

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ia/contexto/?usuario=<id>` | Financial context sent to the LLM. |
| GET | `/ia/feedback/?usuario=<id>&seccion=<seccion>` | Stored feedback (all sections, or one). |
| POST | `/ia/feedback/` | Regenerates feedback: `usuario` and optional list `secciones`. |
| GET | `/ia/feedback/stats/?usuario=<id>` | Token usage (total and per section). |

Sections: `general`, `cuentas`, `gastos`, `metas`, `suscripciones`, `reportes`.

---

## Data Models

| Model (table) | Key fields |
|---------------|------------|
| **CuentaBancaria** (`app_cuentabancaria`) | `usuario`, `nombre`, `tipo` (Ahorros / Corriente / Billetera Digital / Tarjeta de Crédito), `saldo`, `tope_gasto_mensual`, `fecha_creacion` |
| **Suscripcion** (`app_suscripcion`) | `usuario`, `cuenta`, `nombre`, `servicio_preset`, `monto`, `frecuencia` (Mensual / Anual), `fecha_proximo_pago`, `fecha_creacion` |
| **MetaAhorro** (`app_metaahorro`) | `usuario`, `cuenta`, `nombre`, `monto_objetivo`, `monto_actual`, `fecha_limite`, `fecha_creacion` |
| **FeedbackIA** (`app_feedbackia`) | `usuario`, `seccion`, `contenido`, `tokens_usados`, `trigger`, `creado_en`, `actualizado_en` (unique per `usuario` + `seccion`) |
| **Transaccion** (`transacciones_transaccion`) | `usuario`, `cuenta`, `monto`, `tipo` (ingreso / gasto / transferencia), `descripcion`, `fecha` |

The diagrams are in [`docs/diagrams/`](docs/diagrams/).

---

## Frontend Pages

| Route | Component | Features |
|-------|-----------|----------|
| `/login` | `UserSelection` | Register or log in with a name. |
| `/dashboard` | `AccountsManager` | Accounts, balances, transaction form and history, transfers, account detail. |
| `/suscripciones` | `SubscriptionsManager` | Create, edit and delete subscriptions; auto-debit processing; upcoming-payment alerts. |
| `/analytics` | `AnalyticsDashboard` | Income, expense, balance and transfers report. |
| `/metas` | `GoalsManager` | Create goals, add or release funds, progress. |
| `/feedback` | `Feedback` | Six AI feedback sections, per-section regeneration, token usage. |

---

## Useful Commands

| Action | Command |
|--------|---------|
| Check the Django project | `python manage.py check` |
| Run backend tests | `python manage.py test` |
| Lint the frontend | `cd frontend && npm run lint` |
| Build the frontend | `cd frontend && npm run build` |

> No automated tests are defined yet: `app/tests.py` and `transacciones/tests.py` are empty placeholders, and the frontend has no test script.

---

## Development Notes

* The configuration is meant for local development: `DEBUG` is enabled and the Django `SECRET_KEY` is in `core/settings.py`.
* Authentication is name-only (no password), a limitation of the MVP. `GET /api/cuentas/` returns every account unless `?usuario=<id>` is given (the frontend always sends it).

---

## Integrants

- Thomas Bedoya
- Eder Ceballos
- David Guerra
