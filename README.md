---

# Finance Project — Backend API

A web application for personal finance management, designed to track and manage income, expenses, and financial flows.

This repository contains the foundational API built with **Django** and **Django REST Framework (DRF)**, prepared for future integration with a **React** frontend and Artificial Intelligence microservices powered by **FastAPI**.

---

##  Technologies Used

* **Language:** Python 3.14+
* **Web Framework:** Django 6.1.1
* **API Framework:** Django REST Framework 3.18.1
* **Database:** SQLite (Development)

---

##  Prerequisites

Make sure you have **Python** (version 3.14 or higher) and `pip` installed on your operating system.

---

##  Execution Instructions

Follow these steps in order to set up and run the local development environment.

### 1. Clone the repository and set up the virtual environment

```bash
# Clone the repository
git clone <REPOSITORY_URL>
cd <FOLDER_NAME>

# Create the virtual environment
python -m venv venv

# Activate the virtual environment
# On Linux/macOS (Bash/Zsh):
source venv/bin/activate

# On Linux/macOS (Fish):
source venv/bin/activate.fish

# On Windows (CMD):
venv\Scripts\activate.bat

# On Windows (PowerShell):
venv\Scripts\Activate.ps1

```

### 2. Install dependencies

Install all required packages by running:

```bash
pip install -r requirements.txt

```

### 3. Set up the Database

Apply migrations to initialize the database schema (*Users*, *Categories*, *Accounts*, and *Transactions*):

```bash
python manage.py makemigrations
python manage.py migrate

```

*(Optional)* Create a superuser to access and manage the platform via the Django admin panel:

```bash
python manage.py createsuperuser

```

### 4. Run the Server

Start the local development server:

```bash
python manage.py runserver

```

The server will be available at: **`[http://127.0.0.1:8000/](http://127.0.0.1:8000/)`**

---

##  API Endpoints

Currently, the system features the foundational transaction management module.

### Register Manual Transaction

* **URL:** `/api/transacciones/registrar/`
* **Method:** `POST`
* **Description:** Allows registering a new income or expense associated with a user.

#### Request Body Example (`JSON`):

```json
{
  "usuario": 1,
  "tipo": "gasto",
  "monto": "45000.00",
  "fecha": "2026-09-08",
  "descripcion": "Grocery shopping at Tienda D1",
  "categoria": null,
  "cuenta": null
}

```

#### Responses:

| Code | Status | Description |
| --- | --- | --- |
| `201 Created` | Success | Returns the created object including its assigned `id`. |
| `400 Bad Request` | Error | Required fields are missing or the submitted data is invalid. |

---

##  System Architecture

The project implements **Domain-Driven Design (DDD)** principles within its core applications (e.g., `transacciones/`), structuring internal logic into clear layers:

* **Domain (`domain/`):** Pure business logic and domain models.
* **Infrastructure (`infra/`):** Database interactions, Django ORM, and external services.
* **Services (`services/`):** Use cases and orchestration of financial flows.

This decoupled separation facilitates system scalability and seamless future integration of modules such as advanced bank account management and automated AI categorization.
