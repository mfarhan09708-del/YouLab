FROM dunglas/frankenphp:1-php8.4-alpine

RUN install-php-extensions pdo_mysql mbstring
WORKDIR /app

COPY Caddyfile /etc/caddy/Caddyfile
COPY *.html ./public/
COPY assets/ ./public/assets/
COPY api/ ./public/api/
RUN rm -f ./public/api/config/database.local.example.php
RUN rm -f ./public/index.php

ENV YOULAB_ENV=production
ENV YOULAB_SESSION_DRIVER=mysql
ENV PORT=80

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
