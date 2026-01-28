FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    gnupg \
    lsb-release \
    sudo \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install PostgreSQL
RUN apt-get update && apt-get install -y postgresql postgresql-contrib

# Install PHP 8.2
RUN apt-get update && apt-get install -y \
    software-properties-common \
    && add-apt-repository ppa:ondrej/php -y \
    && apt-get update \
    && apt-get install -y \
        php8.2 \
        php8.2-fpm \
        php8.2-mysql \
        php8.2-pgsql \
        php8.2-curl \
        php8.2-gd \
        php8.2-mbstring \
        php8.2-xml \
        php8.2-zip \
        php8.2-intl

# Install MySQL
RUN apt-get update && apt-get install -y mysql-server

# Install Nginx
RUN apt-get update && apt-get install -y nginx

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Create a non-root user
ARG USERNAME=codespace
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set up PostgreSQL
RUN service postgresql start && \
    sudo -u postgres psql -c "CREATE USER forum_user WITH PASSWORD 'forum_password';" && \
    sudo -u postgres psql -c "CREATE DATABASE forum_db OWNER forum_user;"

# Set up MySQL
RUN service mysql start && \
    mysql -e "CREATE DATABASE flarum;" && \
    mysql -e "CREATE USER 'flarum'@'localhost' IDENTIFIED BY 'flarum';" && \
    mysql -e "GRANT ALL PRIVILEGES ON flarum.* TO 'flarum'@'localhost';" && \
    mysql -e "FLUSH PRIVILEGES;"

# Set up Flarum
WORKDIR /var/www/flarum
RUN chown -R $USERNAME:$USERNAME /var/www/flarum
USER $USERNAME
RUN composer create-project flarum/flarum . --stability=beta --no-interaction
# Note: We'll need to configure Flarum's database settings later.

# Set up tor-gate
WORKDIR /workspace/torgate
COPY torgate/package*.json ./
RUN npm install

# Copy configuration files for Nginx, PHP
