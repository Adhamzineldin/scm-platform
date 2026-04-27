-- Extra databases for microservices that own their data stores.
-- Runs once on first postgres container boot (alphabetical order).
CREATE DATABASE cart_db;
CREATE DATABASE scm_shipment_db;
CREATE DATABASE scm_inventory_db;

-- Grant all privileges to the shared admin user
GRANT ALL PRIVILEGES ON DATABASE cart_db          TO admin;
GRANT ALL PRIVILEGES ON DATABASE scm_shipment_db  TO admin;
GRANT ALL PRIVILEGES ON DATABASE scm_inventory_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE scm_order_db     TO admin;
GRANT ALL PRIVILEGES ON DATABASE scm_warehouse_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE logistics_db     TO admin;

