#!/bin/bash

echo "🚀 Starting development services..."
echo "=================================="

# Start Nginx
echo "🌐 Starting Nginx..."
nginx

# Start PHP-FPM
echo "🐘 Starting PHP-FPM..."
php-fpm -D

# Check if Flarum is installed
if [ -f "/var/www/flarum/composer.json" ]; then
    echo "📦 Flarum is installed"
    
    # Check database connection
    echo "🔍 Checking database connection..."
    php /var/www/flarum/flarum migrate:status
    
    # Generate Flarum assets
    echo "🎨 Generating Flarum assets..."
    cd /var/www/flarum
    php flarum assets:publish
    
    # Clear cache
    php flarum cache:clear
fi

# Start security gateway if present
if [ -d "/var/www/security-gateway" ] && [ -f "/var/www/security-gateway/package.json" ]; then
    echo "🔒 Starting Security Gateway..."
    cd /var/www/security-gateway
    npm start &
fi

echo "✅ All services started!"
echo ""
echo "📊 Service Status:"
echo "   Nginx:     $(pgrep nginx >/dev/null && echo '✅ Running' || echo '❌ Stopped')"
echo "   PHP-FPM:   $(pgrep php-fpm >/dev/null && echo '✅ Running' || echo '❌ Stopped')"
echo "   MariaDB:   Check via docker-compose"
echo "   Redis:     Check via docker-compose"
echo ""
echo "📝 View logs:"
echo "   tail -f /var/log/nginx/access.log"
echo "   tail -f /var/log/nginx/error.log"
echo "   tail -f /var/log/php/error.log"

# Keep container running
tail -f /dev/null
