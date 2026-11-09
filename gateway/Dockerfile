FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/ /app/frontend/
RUN cd /app/frontend && npm ci && npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY gateway/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]