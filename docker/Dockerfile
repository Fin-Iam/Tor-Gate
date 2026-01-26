# Flarum Forum with Security Gateway
# Multi-stage build for development

FROM php:8.2-fpm-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    git \
    gnupg \
    mariadb-client \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        gd \
        zip \
        mbstring \
        intl \
        opcache

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Create app directory
WORKDIR /var/www/flarum

# Install Flarum
RUN composer create-project flarum/flarum . --stability=beta --no-interaction

# Set permissions
RUN chown -R www-data:www-data /var/www/flarum \
    && chmod -R 775 /var/www/flarum/storage \
    && chmod -R 775 /var/www/flarum/public/assets

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY flarum.conf /etc/nginx/conf.d/default.conf

# Copy security gateway files
COPY security-gateway/ /var/www/security-gateway/

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE 80

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# Development stage with Xdebug
FROM base AS development

RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug

COPY xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini

# Production stage
FROM base AS production

# Enable OPcache
COPY opcache.ini /usr/local/etc/php/conf.d/opcache.ini

# Security hardening
RUN rm -rf /var/www/flarum/.git \
    && find /var/www/flarum -type f -name "*.md" -delete \
    && find /var/www/flarum -type f -name "*.txt" -delete
