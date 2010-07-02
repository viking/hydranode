CREATE DATABASE hydranode;
GRANT ALL ON hydranode.* TO hydranode@localhost IDENTIFIED BY 'hydranode';
USE hydranode;
CREATE TABLE jobs (
  id INT NOT NULL AUTO_INCREMENT,
  program VARCHAR(50),
  version VARCHAR(50),
  arguments VARCHAR(255),
  description VARCHAR(255),
  owner_ip VARCHAR(16),
  created_at DATETIME,
  PRIMARY KEY(id)
);
