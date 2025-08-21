# Mini Project Management System (Django + GraphQL + React + TS)

A reference implementation for the screening task. It includes:
- **Backend**: Django 4 + Graphene (GraphQL), org-based multi-tenancy via `X-Org-Slug` header.
- **Frontend**: React 18 + TypeScript, Apollo Client, TailwindCSS.
- **Database**: PostgreSQL (via Docker) or SQLite for quick local runs.

## Quick Start (Docker)
## Step 1: Build & Start Containers
```bash
docker-compose up --build
```
- Builds Docker images and starts containers (backend, frontend, PostgreSQL).

- To run in the background (detached mode):
```bash
docker-compose up -d --build
```
## Step 2: Visit Applications
- Backend GraphiQL (GraphQL Playground) → http://localhost:8000/graphql

- Frontend App → http://localhost:5173
## Step 3: Seed a Default Organization
```bash
docker compose exec backend python manage.py shell -c "from core.models import Organization; Organization.objects.get_or_create(slug='demo-org', defaults={'name':'Demo Org','contact_email':'demo@example.com'})"
```
- Ensures there’s a demo-org in the database for testing.
## Step 4: Create Django Superuser (Admin)
```bash
docker compose exec backend python manage.py createsuperuser
```
- Enter username, email, and password interactively.

- Optional non-interactive command:
```bash
docker compose exec backend python manage.py createsuperuser --username admin --email admin@example.com
```
- Django Admin URL: http://localhost:8000/admin
## Step 5: Stop / Shutdown Containers
- Stop containers without removing volumes (keeps database):
```bash
docker-compose down
```
- Stop containers and remove volumes (resets database):
```bash
docker-compose down -v
```
## Step 6: Enter / Exit Backend Container
```bash
# Enter backend container shell
docker compose exec backend bash

# Exit container
exit
```

## Quick Start (Local without Docker)
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py shell -c "from core.models import Organization; Organization.objects.get_or_create(slug='demo-org', defaults={'name':'Demo Org','contact_email':'demo@example.com'})"
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm i
npm run dev
```

Ensure Apollo sends the header `X-Org-Slug: demo-org` (stored in localStorage).

## GraphQL Examples
**Create Project**
```graphql
mutation { createProject(name:"Site Revamp", description:"Marketing site", status:"ACTIVE") { project { id name status } } }
```

**List Projects**
```graphql
query { projects { id name status stats { task_count completed_tasks completion_rate } } }
```

**Create Task**
```graphql
mutation { createTask(projectId: 1, title:"Design homepage", assigneeEmail:"ui@example.com") { task { id title status } } }
```

**Add Comment**
```graphql
mutation { addTaskComment(taskId: 1, content:"Please add hero image", authorEmail:"pm@example.com") { comment { id content timestamp } } }
```

## Testing (backend quick smoke)
```bash
cd backend
python manage.py test
python manage.py test core.test_graphql
```

## Notes
- This code isolates all reads/writes by the current `Organization` taken from the `X-Org-Slug` header.
- You can extend with auth, subscriptions, filtering.
