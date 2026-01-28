#!/bin/bash
set -e

echo "🚀 Starting Flarum Security Gateway Development Environment..."
echo "============================================================"

# Wait for MariaDB to be ready
echo "⏳ Waiting for MariaDB..."
while ! mysqladmin ping -h"mariadb" -u"flarum" -p"flarum_secret_password" --silent; do
    sleep 1
done

echo "✅ MariaDB is ready!"

# Install Flarum if not already installed
if [ ! -f "/var/www/flarum/composer.json" ]; then
    echo "📦 Installing Flarum..."
    composer create-project flarum/flarum . --stability=beta --no-interaction
    chown -R www-data:www-data /var/www/flarum
    chmod -R 775 /var/www/flarum/storage /var/www/flarum/public/assets
    
    # Configure Flarum database
    echo "⚙️ Configuring Flarum..."
    php flarum install \
        --file config.yml \
        --databaseHost mariadb \
        --databaseName flarum \
        --databaseUser flarum \
        --databasePass flarum_secret_password \
        --adminUser admin \
        --adminPass admin123 \
        --adminEmail admin@example.com
fi

# Setup security gateway if directory exists
if [ -d "/var/www/security-gateway" ]; then
    echo "🔒 Setting up Security Gateway..."
    cd /var/www/security-gateway
    if [ -f "package.json" ]; then
        npm install
    fi
fi

echo "✅ Setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Flarum Forum:    http://localhost:8080"
echo "   phpMyAdmin:      http://localhost:8081"
echo "   MariaDB:         localhost:3306 (user: flarum, pass: flarum_secret_password)"
echo "   Redis:           localhost:6379"
echo ""
echo "🔧 Commands:"
echo "   php flarum migrate    - Run migrations"
echo "   composer update       - Update dependencies"
echo "   php flarum seed       - Seed database"

exec "$@"
