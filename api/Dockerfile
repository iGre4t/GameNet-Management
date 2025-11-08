FROM php:8.2-apache

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Harden Apache a bit
RUN a2enmod headers rewrite

# Copy API sources (when building without bind mount)
COPY . /var/www/html/

# Ensure correct permissions for runtime (dev-friendly)
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

