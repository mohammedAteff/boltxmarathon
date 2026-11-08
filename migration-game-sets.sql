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
