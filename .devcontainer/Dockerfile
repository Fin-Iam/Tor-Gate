# Flarum Development Container
FROM php:8.2-fpm-alpine

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
    sqlite-dev \
    nodejs \
    npm \
    yarn \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_sqlite \
        gd \
        zip \
        mbstring \
        intl \
        opcache \
        bcmath

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Create app directory
WORKDIR /var/www/flarum

# Copy Nginx configuration
COPY .devcontainer/config/nginx/flarum.conf /etc/nginx/http.d/default.conf
COPY .devcontainer/config/nginx/security-gateway.conf /etc/nginx/http.d/security-gateway.conf

# Copy PHP configuration
COPY .devcontainer/config/php/php.ini /usr/local/etc/php/conf.d/custom.ini

# Copy supervisor configuration
COPY .devcontainer/config/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY .devcontainer/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/flarum \
    && chmod -R 775 /var/www/flarum/storage \
    && chmod -R 775 /var/www/flarum/public/assets

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
