SET NAMES utf8mb4;
CREATE TABLE admins (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(80) NOT NULL UNIQUE, hash VARCHAR(255) NOT NULL);
CREATE TABLE login_attempts (ip VARCHAR(45) PRIMARY KEY, attempts INT NOT NULL, since_at BIGINT NOT NULL);
CREATE TABLE settings (
 id INT PRIMARY KEY, version BIGINT NOT NULL DEFAULT 0, current_player INT NULL,
 default_limit INT NOT NULL DEFAULT 5, spin_ms INT NOT NULL DEFAULT 4600,
 result_ms INT NOT NULL DEFAULT 5000, box_ms INT NOT NULL DEFAULT 1050,
 motion TINYINT NOT NULL DEFAULT 1, intensity INT NOT NULL DEFAULT 75,
 sound TINYINT NOT NULL DEFAULT 0, fullscreen TINYINT NOT NULL DEFAULT 0
);
INSERT INTO settings (id) VALUES (1);
CREATE TABLE players (
 id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, cap INT NULL,
 position INT NOT NULL DEFAULT 0, active TINYINT NOT NULL DEFAULT 1,
 deleted TINYINT NOT NULL DEFAULT 0, avatar MEDIUMBLOB NULL
);
CREATE TABLE items (
 id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, icon VARCHAR(24) NOT NULL DEFAULT ''
);
CREATE TABLE units (
 id INT AUTO_INCREMENT PRIMARY KEY, item_id INT NOT NULL, player_id INT NULL,
 status ENUM('available','assigned','removed') NOT NULL DEFAULT 'available', revision INT NOT NULL DEFAULT 0,
 FOREIGN KEY(item_id) REFERENCES items(id), FOREIGN KEY(player_id) REFERENCES players(id),
 CHECK ((status = 'assigned') = (player_id IS NOT NULL)), INDEX(status, item_id), INDEX(player_id)
);
CREATE TABLE challenges (id INT AUTO_INCREMENT PRIMARY KEY, text VARCHAR(600) NOT NULL, icon VARCHAR(24) NOT NULL DEFAULT '');
CREATE TABLE boxes (
 id INT AUTO_INCREMENT PRIMARY KEY, challenge_id INT NOT NULL, number INT NOT NULL UNIQUE,
 opened_at DATETIME(3) NULL, open_seq BIGINT NULL, FOREIGN KEY(challenge_id) REFERENCES challenges(id)
);
CREATE TABLE events (
 id BIGINT PRIMARY KEY, action VARCHAR(32) NOT NULL, source VARCHAR(20) NOT NULL,
 detail JSON NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX(action,id)
);
CREATE TABLE spins (
 id BIGINT PRIMARY KEY, unit_id INT NOT NULL, player_id INT NOT NULL, revision INT NOT NULL,
 undone TINYINT NOT NULL DEFAULT 0, FOREIGN KEY(id) REFERENCES events(id),
 FOREIGN KEY(unit_id) REFERENCES units(id), FOREIGN KEY(player_id) REFERENCES players(id)
);
CREATE TABLE game_sets (
 id INT AUTO_INCREMENT PRIMARY KEY,
 kind ENUM('wheel','boxes') NOT NULL,
 name VARCHAR(100) NOT NULL,
 current_player INT NULL
);
INSERT INTO game_sets(id,kind,name,current_player)
 SELECT 1,'wheel','Main wheel',current_player FROM settings WHERE id=1;
INSERT INTO game_sets(id,kind,name) VALUES (2,'boxes','Main box event');

ALTER TABLE players ADD game_id INT NOT NULL DEFAULT 1, ADD FOREIGN KEY (game_id) REFERENCES game_sets(id);
ALTER TABLE items ADD game_id INT NOT NULL DEFAULT 1, ADD FOREIGN KEY (game_id) REFERENCES game_sets(id);
ALTER TABLE challenges ADD game_id INT NOT NULL DEFAULT 2, ADD FOREIGN KEY (game_id) REFERENCES game_sets(id);
ALTER TABLE boxes ADD game_id INT NOT NULL DEFAULT 2, ADD FOREIGN KEY (game_id) REFERENCES game_sets(id),
 DROP INDEX number, ADD UNIQUE KEY game_box_number (game_id,number);
ALTER TABLE events ADD game_id INT NOT NULL DEFAULT 1;
UPDATE events SET game_id=2 WHERE LEFT(action,4)='box_' OR LEFT(action,10)='challenge_';
ALTER TABLE events ADD FOREIGN KEY (game_id) REFERENCES game_sets(id), ADD KEY game_events (game_id,id);
