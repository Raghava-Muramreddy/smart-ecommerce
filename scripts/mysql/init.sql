-- MySQL initialization script
CREATE DATABASE IF NOT EXISTS smart_ecommerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Grant full access to app user
GRANT ALL PRIVILEGES ON smart_ecommerce.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
