DROP DATABASE IF EXISTS hydranode;
CREATE DATABASE hydranode;
GRANT ALL ON hydranode.* TO hydranode@localhost IDENTIFIED BY 'hydranode';
USE hydranode;
CREATE TABLE jobs (
  id INT NOT NULL AUTO_INCREMENT,
  program VARCHAR(50),
  version VARCHAR(50),
  arguments VARCHAR(255),
  description VARCHAR(255),
  created_by VARCHAR(16),
  created_at DATETIME,
  updated_at DATETIME,
  taken_by VARCHAR(16),
  taken_at DATETIME,
  finished_at DATETIME,
  result TEXT,
  PRIMARY KEY(id)
);
