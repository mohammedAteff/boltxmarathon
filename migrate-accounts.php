<?php
require __DIR__.'/config.php';
if(PHP_SAPI!=='cli') exit(1);
if(!one('SELECT id FROM admins LIMIT 1')){
    fwrite(STDERR,"Create an operator with setup-admin.php before migrating accounts.\n");
    exit(1);
}

db()->exec("CREATE TABLE IF NOT EXISTS user_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    display_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci UNIQUE,
    password_hash VARCHAR(255) NULL,
    google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin UNIQUE,
    photo_url VARCHAR(1024) NULL,
    verified_at DATETIME NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    disabled TINYINT NOT NULL DEFAULT 0,
    auth_version INT NOT NULL DEFAULT 0,
    legacy_admin_id INT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (legacy_admin_id) REFERENCES admins(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
db()->exec("CREATE TABLE IF NOT EXISTS account_tokens (
    token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
    user_id INT NOT NULL,
    purpose ENUM('verify','reset') NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX account_token_owner (user_id,purpose),
    FOREIGN KEY (user_id) REFERENCES user_accounts(id)
) ENGINE=InnoDB");
db()->exec("CREATE TABLE IF NOT EXISTS account_attempts (
    bucket CHAR(64) CHARACTER SET ascii PRIMARY KEY,
    attempts INT NOT NULL,
    window_start BIGINT NOT NULL,
    INDEX (window_start)
) ENGINE=InnoDB");

$columns=[
    'owner_user_id'=>'INT NULL, ADD CONSTRAINT game_owner_user FOREIGN KEY (owner_user_id) REFERENCES user_accounts(id)',
    'deleted_at'=>'DATETIME NULL',
    'share_envelope'=>'TEXT NULL',
];
foreach($columns as $name=>$definition){
    if(!one('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',['game_sets',$name])){
        db()->exec("ALTER TABLE game_sets ADD COLUMN $name $definition");
    }
}

$db=db(); $db->beginTransaction();
try{
    sql("INSERT INTO user_accounts(display_name,role,legacy_admin_id)
        SELECT username,'admin',id FROM admins
        ON DUPLICATE KEY UPDATE legacy_admin_id=VALUES(legacy_admin_id)");
    $fallback=one("SELECT MIN(id) AS id FROM user_accounts WHERE role='admin' AND disabled=0")['id'];
    sql('UPDATE game_sets g LEFT JOIN user_accounts a ON a.legacy_admin_id=g.owner_id
        SET g.owner_user_id=COALESCE(a.id,?) WHERE g.owner_user_id IS NULL',[$fallback]);
    $db->commit();
}catch(Throwable $e){$db->rollBack();throw $e;}
if(one("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='game_sets' AND COLUMN_NAME='owner_user_id' AND IS_NULLABLE='YES'")){
    db()->exec('ALTER TABLE game_sets MODIFY owner_user_id INT NOT NULL');
}
echo "BOLTX personal accounts schema ready.\n";
