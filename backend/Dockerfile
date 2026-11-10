FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN groupadd -r deskly && useradd -r -g deskly deskly
COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY alembic.ini .
COPY alembic ./alembic
COPY deskly ./deskly
USER deskly
EXPOSE 8000
CMD ["uvicorn", "deskly.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
