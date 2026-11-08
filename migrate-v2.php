<?php
require __DIR__.'/config.php';
if(PHP_SAPI!=='cli') exit(1);

function add_column(string $table,string $name,string $type): void {
    if(!one('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[$table,$name])) {
        db()->exec("ALTER TABLE $table ADD COLUMN $name $type");
    }
}

foreach([
    'owner_id'=>'INT NULL',
    'created_at'=>'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    'updated_at'=>'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)',
    'archived'=>'TINYINT NOT NULL DEFAULT 0',
    'options'=>'JSON NULL',
    'code_hash'=>'CHAR(64) NULL UNIQUE',
    'link_hash'=>'CHAR(64) NULL UNIQUE',
    'display_hash'=>'CHAR(64) NULL UNIQUE',
    'access_expires_at'=>'DATETIME NULL',
    'access_version'=>'INT NOT NULL DEFAULT 0',
    'share_role'=>"ENUM('view','play') NOT NULL DEFAULT 'view'",
    'state_version'=>'BIGINT NOT NULL DEFAULT 0',
] as $name=>$type) add_column('game_sets',$name,$type);
add_column('units','completed','TINYINT NOT NULL DEFAULT 0');
add_column('boxes','scratch_pending','TINYINT NOT NULL DEFAULT 0');

db()->exec("CREATE TABLE IF NOT EXISTS challenge_access_attempts (
 ip_hash CHAR(64) PRIMARY KEY, attempts INT NOT NULL, window_start BIGINT NOT NULL
)");
db()->exec("CREATE TABLE IF NOT EXISTS spin_acceptances (
 game_id INT NOT NULL, request_id CHAR(32) NOT NULL, event_id BIGINT NOT NULL,
 PRIMARY KEY(game_id,request_id), FOREIGN KEY(game_id) REFERENCES game_sets(id),
 FOREIGN KEY(event_id) REFERENCES events(id)
)");

$defaults=one('SELECT default_limit,spin_ms,result_ms,box_ms,motion,intensity,sound,fullscreen FROM settings WHERE id=1');
sql('UPDATE game_sets g SET g.options=?,g.state_version=COALESCE((SELECT MAX(e.id) FROM events e WHERE e.game_id=g.id),0),
 g.owner_id=(SELECT MIN(id) FROM admins) WHERE g.options IS NULL',[json_encode($defaults,JSON_THROW_ON_ERROR)]);
echo "BOLTX V2 schema ready.\n";
