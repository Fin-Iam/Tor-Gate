#!/bin/bash
set -e

echo "🔧 Setting up development environment..."
echo "========================================"

# Install additional tools
apk add --no-cache \
    vim \
    htop \
    net-tools \
    iproute2 \
    tcpdump \
    jq \
    yq \
    curl \
    wget

# Create necessary directories
mkdir -p /var/www/flarum/storage
mkdir -p /var/www/flarum/public/assets
mkdir -p /var/log/nginx
mkdir -p /var/log/php
mkdir -p /var/log/supervisor

# Set permissions
chown -R www-data:www-data /var/www/flarum
chmod -R 775 /var/www/flarum/storage /var/www/flarum/public/assets

# Install PHP extensions for development
docker-php-ext-install xdebug
echo "zend_extension=xdebug" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
echo "xdebug.mode=develop,debug" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
echo "xdebug.client_host=host.docker.internal" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
echo "xdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

echo "✅ Development tools installed!"
