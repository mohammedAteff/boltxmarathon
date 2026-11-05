SET NAMES utf8mb4;
INSERT INTO players(name,position) VALUES ('BOLTX',1),('FARIS',2),('OMAR',3),('ZEYAD',4);
INSERT INTO items(name,icon) VALUES ('عصير برتقال','🍊'),('عصير فراولة','🍓'),('مشروب طاقة','⚡'),('عصير مانجو','🥭'),('كولا','🥤'),('ليمون بالنعناع','🍋'),('شاي مثلج','🧋');
INSERT INTO units(item_id) SELECT id FROM items UNION ALL SELECT id FROM items UNION ALL SELECT id FROM items;
INSERT INTO challenges(text,icon) VALUES ('أضف شطة حارة','🌶️'),('اشرب رشفة صغيرة','🥤'),('قلّد صوت شخصية','🎭'),('اختار لاعب يتحداك','⚡'),('احكِ نكتة','😄'),('غمّض عينيك وخمّن النكهة','👀'),('ضاعف الكمية','×2'),('قول جملة بسرعة','🎙️'),('بدّل الكوب مع لاعب','🔄'),('اشربه بدون ما تهز','🥤'),('غنّي لمدة عشر ثواني','🎵'),('اختر نكهة جديدة','🍋'),('تحدي بدون ضحك','😶'),('دور مرة أخرى','🎲'),('اللاعبون يختارون التحدي','👑');
INSERT INTO boxes(challenge_id,number) SELECT id,id FROM challenges;
UPDATE settings SET current_player=1 WHERE id=1;
