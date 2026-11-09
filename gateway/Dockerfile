FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/ /app/frontend/
RUN cd /app/frontend && npm ci && npm run build