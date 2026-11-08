const translations = new Map(Object.entries({
    'BOLTX Challenge Games':'ألعاب تحديات BOLTX',
    'THE LIVE CHALLENGE ARENA':'ساحة التحديات المباشرة',
    'Pick your':'اختر', 'challenge':'تحديك', 'Spin Wheel':'عجلة الحظ', 'Mystery Boxes':'الصناديق الغامضة',
    'SPIN':'أدر', 'SPIN WHEEL':'عجلة الحظ', 'WHEEL':'الحظ', 'MYSTERY':'الصناديق', 'BOXES':'الصناديق',
    'RANDOM CHALLENGE':'تحدٍ عشوائي', 'OPEN · REVEAL · CHALLENGE':'افتح · اكشف · تحدَّ',
    'Create new':'إنشاء جديد', 'Open existing':'فتح تحدٍ محفوظ', 'Operator control room →':'لوحة التحكم ←',
    'Open a private challenge':'افتح تحديًا خاصًا', 'Enter the code shared by your host.':'أدخل الرمز الذي شاركه معك المضيف.',
    'Challenge type':'نوع التحدي', 'Access code':'رمز الدخول', 'Open challenge':'افتح التحدي', 'Back to games':'العودة إلى الألعاب',
    'Control room':'لوحة التحكم', 'Sign in to operate both games.':'سجّل الدخول لإدارة الألعاب.', 'Sign in':'تسجيل الدخول',
    'Sign out':'تسجيل الخروج', 'Username':'اسم المستخدم', 'Password':'كلمة المرور',
    'Challenges':'التحديات', 'Settings':'التحديات', 'Game settings':'إعدادات التحدي', 'Saved challenges':'التحديات المحفوظة',
    'Selected wheel':'العجلة المحددة', 'Selected box event':'فعالية الصناديق المحددة', 'New wheel':'عجلة جديدة',
    'New event':'فعالية جديدة', 'New box event':'فعالية صناديق جديدة', 'Rename':'إعادة التسمية', 'Rename wheel':'إعادة تسمية العجلة',
    'Rename box event':'إعادة تسمية الفعالية', 'Create wheel':'إنشاء عجلة', 'Create box event':'إنشاء فعالية صناديق',
    'Initial setup (optional)':'الإعداد الأولي (اختياري)', 'Players, one per line':'اللاعبون، لاعب واحد في كل سطر',
    'Items, one per line':'العناصر، عنصر واحد في كل سطر', 'Box challenges, one per line':'تحديات الصناديق، تحدٍ واحد في كل سطر',
    'Share':'مشاركة', 'Share ↗':'مشاركة ↗', 'Share challenge':'مشاركة التحدي', 'Private link':'الرابط الخاص',
    'Read-only display link':'رابط العرض فقط', 'Sharing permission':'صلاحية المشاركة', 'View only':'عرض فقط',
    'Allow gameplay':'السماح باللعب', 'Generate code and links':'إنشاء رمز وروابط', 'Rotate code and links':'تجديد الرمز والروابط',
    'Access expires':'انتهاء صلاحية الوصول','Never':'أبدًا','After one day':'بعد يوم واحد','After one week':'بعد أسبوع','After 30 days':'بعد ٣٠ يومًا',
    'Open challenge ↗':'فتح التحدي ↗','Manage challenge':'إدارة التحدي','Restore this challenge before playing.':'استعد التحدي قبل اللعب.',
    'Revoke links':'إلغاء الروابط', 'Archive challenge':'أرشفة التحدي', 'Restore challenge':'استعادة التحدي',
    'Archive this challenge and revoke guest access?':'أرشفة هذا التحدي وإلغاء وصول الضيوف؟',
    'Revoke the existing code, links, and guest sessions?':'إلغاء الرمز والروابط وجلسات الضيوف الحالية؟',
    'Restore this challenge?':'استعادة هذا التحدي؟', 'Copy':'نسخ', 'Copied':'تم النسخ',
    'Generate a private code and links for this challenge.':'أنشئ رمزًا وروابط خاصة لهذا التحدي.',
    'Save these credentials now. Generating new credentials revokes the previous ones.':'احفظ هذه البيانات الآن. إنشاء بيانات جديدة يلغي البيانات السابقة.',
    'Generating new credentials revokes the previous ones.':'إنشاء بيانات مشاركة جديدة يلغي البيانات السابقة.',
    'YOUR BOLTX ACCOUNT':'حسابك في BOLTX', 'Login / Register':'تسجيل الدخول / إنشاء حساب',
    'My Challenges':'تحدياتي', 'All Challenges':'كل التحديات', 'My Wheels':'عجلاتي', 'My Mystery Boxes':'صناديقي الغامضة',
    'Create your account':'أنشئ حسابك', 'Create account':'إنشاء حساب', 'Email address':'البريد الإلكتروني',
    'Display name':'الاسم المعروض', 'Confirm password':'تأكيد كلمة المرور', 'Forgot password?':'نسيت كلمة المرور؟',
    'Account settings':'إعدادات الحساب', 'OR':'أو', 'Reset your password':'إعادة تعيين كلمة المرور',
    'Choose a new password':'اختر كلمة مرور جديدة', 'Send reset link':'إرسال رابط إعادة التعيين',
    'Save password':'حفظ كلمة المرور', 'Verify your email':'تحقق من بريدك الإلكتروني', 'Verify email':'التحقق من البريد',
    'You’re ready':'حسابك جاهز', 'Account links':'روابط الحساب',
    'Sign in to create a wheel.':'سجّل الدخول لإنشاء عجلة حظ.', 'Sign in to create mystery boxes.':'سجّل الدخول لإنشاء صناديق غامضة.',
    'Sign in with email or Google':'سجّل الدخول بالبريد الإلكتروني أو Google',
    'Use the Google button to link your verified Google identity to this account.':'استخدم زر Google لربط حسابك المُتحقَّق منه بهذا الحساب.',
    'Sign in again before changing your password or linking Google.':'سجّل الدخول مجددًا قبل تغيير كلمة المرور أو ربط Google.',
    'Sign in again before changing your password.':'سجّل الدخول مجددًا قبل تغيير كلمة المرور.',
    'Sign in again before linking Google.':'سجّل الدخول مجددًا قبل ربط Google.',
    'Use the Google account with the same email address.':'استخدم حساب Google المرتبط بنفس البريد الإلكتروني.',
    'This account already has a different Google identity or the session has changed.':'هذا الحساب مرتبط بهوية Google أخرى أو أن جلستك تغيرت.',
    'An account already uses this email. Sign in with email and link Google from Account settings.':'هذا البريد مستخدم بالفعل. سجّل الدخول بالبريد ثم اربط Google من إعدادات الحساب.',
    'An account already uses this email. Sign in or reset your password.':'هذا البريد مستخدم بالفعل. سجّل الدخول أو أعد تعيين كلمة المرور.',
    'Google sign-in could not be verified. Try again or use email.':'تعذر التحقق من تسجيل الدخول عبر Google. حاول مجددًا أو استخدم البريد الإلكتروني.',
    'Google sign-in is unavailable. You can still use email.':'تسجيل الدخول عبر Google غير متاح. يمكنك استخدام البريد الإلكتروني.',
    'Account service is temporarily unavailable.':'خدمة الحسابات غير متاحة مؤقتًا.',
    'This account is unavailable.':'هذا الحساب غير متاح.', 'Too many attempts. Try again later.':'محاولات كثيرة. حاول لاحقًا.',
    'Enter a valid email address.':'أدخل بريدًا إلكترونيًا صالحًا.', 'Use a password between 12 and 72 bytes.':'استخدم كلمة مرور بطول ١٢ إلى ٧٢ بايت.',
    'Passwords do not match.':'كلمتا المرور غير متطابقتين.', 'Incorrect email or password.':'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'This email or Google identity is already in use.':'هذا البريد الإلكتروني أو حساب Google مستخدم بالفعل.',
    'Check your email to verify your account.':'راجع بريدك الإلكتروني للتحقق من حسابك.',
    'Your account was created. Request a new verification email from the sign-in page.':'تم إنشاء حسابك. اطلب رسالة تحقق جديدة من صفحة تسجيل الدخول.',
    'Verify your email to sign in. Check your inbox for a verification link.':'تحقق من بريدك لتسجيل الدخول. ابحث عن رابط التحقق في صندوق الوارد.',
    'Password reset email is currently unavailable.':'رسائل إعادة تعيين كلمة المرور غير متاحة حاليًا.',
    'If an eligible account exists, a reset link has been sent.':'إذا كان هناك حساب مؤهل، فقد أُرسل رابط إعادة التعيين.',
    'This link is invalid or expired.':'هذا الرابط غير صالح أو منتهي الصلاحية.',
    'Password updated. You can now sign in.':'تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.',
    'Email verified. You can now sign in.':'تم التحقق من البريد الإلكتروني. يمكنك تسجيل الدخول الآن.',
    'Password updated.':'تم تحديث كلمة المرور.', 'Invalid account request.':'طلب الحساب غير صالح.',
    'Create a challenge to get started.':'أنشئ تحديًا للبدء.', 'New wheel ↗':'عجلة جديدة ↗', 'New box event ↗':'فعالية صناديق جديدة ↗',
    'Edit challenge ↗':'تعديل التحدي ↗', 'Copy link':'نسخ الرابط', 'Copy code':'نسخ الرمز', 'Reset':'إعادة ضبط', 'Delete':'حذف',
    'Loading shared links…':'جارٍ تحميل روابط المشاركة…', 'Open Share to generate copyable credentials.':'افتح المشاركة لإنشاء روابط ورمز قابلين للنسخ.',
    'Reset this challenge’s results and restore items or boxes?':'إعادة ضبط نتائج هذا التحدي واستعادة العناصر أو الصناديق؟',
    'Delete this challenge and revoke its shared links?':'حذف هذا التحدي وإلغاء روابط مشاركته؟',
    'Challenge unavailable.':'التحدي غير متاح.', 'This link does not allow that action.':'هذا الرابط لا يسمح بهذا الإجراء.',
    'Administrator access is required.':'يلزم تسجيل الدخول كمسؤول.',
    'Users and platform settings':'المستخدمون وإعدادات المنصة', 'Back to control room':'العودة إلى لوحة التحكم',
    'Registered users':'المستخدمون المسجلون', 'Permissions':'الصلاحيات', 'Protected administrator':'مسؤول محمي',
    'User':'مستخدم', 'Administrator':'مسؤول', 'Role':'الدور', 'Account status':'حالة الحساب', 'Suspended':'موقوف',
    'Save permissions':'حفظ الصلاحيات', 'Platform defaults':'الإعدادات الافتراضية للمنصة',
    'These settings apply to newly created challenges.':'تنطبق هذه الإعدادات على التحديات الجديدة.', 'Save defaults':'حفظ الإعدادات الافتراضية',
    'Invalid account role.':'دور الحساب غير صالح.', 'This operator account is protected.':'حساب المشغل هذا محمي.',
    'Verify this account’s email before granting administrator access.':'تحقق من بريد هذا الحساب قبل منحه صلاحيات المسؤول.',
    'Select the value and copy it manually.':'حدد القيمة وانسخها يدويًا.', 'Open live game ↗':'فتح اللعبة المباشرة ↗',
    'Display only ↗':'العرض فقط ↗', 'Spin on live wheel ↗':'أدر العجلة المباشرة ↗', 'Open ↗':'فتح ↗', 'Manage ↗':'إدارة ↗',
    'Live wheel':'العجلة المباشرة', 'Wheel items':'عناصر العجلة', 'Undo spin':'التراجع عن الدور', 'Undo this spin':'التراجع عن هذا الدور',
    'Round controls':'إدارة الجولة', 'Wheel round controls':'إدارة جولة العجلة', 'Event controls':'إدارة الفعالية',
    'Box event controls':'إدارة فعالية الصناديق', 'Players':'اللاعبون', 'PLAYERS':'اللاعبون', 'ITEMS':'العناصر',
    'Item':'العنصر', 'Items':'العناصر', 'Available':'متاح', 'Assigned':'تم التوزيع', 'Actions':'الإجراءات',
    'Edit':'تعديل', 'Edit item':'تعديل العنصر', 'Manage':'إدارة', '+ Add item':'＋ إضافة عنصر',
    'Add item':'إضافة عنصر', 'Save item':'حفظ العنصر', 'Item name':'اسم العنصر', 'Available quantity':'الكمية المتاحة',
    'Icon':'الأيقونة', 'Icon (optional)':'الأيقونة (اختياري)', '+ Add player':'＋ إضافة لاعب', 'Add player':'إضافة لاعب',
    'Save player':'حفظ اللاعب', 'Name':'الاسم', 'Save name':'حفظ الاسم', 'Turn order':'ترتيب الدور',
    'Item limit (blank = default, 0 = unlimited)':'حد العناصر (فارغ = افتراضي، ٠ = غير محدود)',
    'Status':'الحالة', 'Active':'نشط', 'Archived':'مؤرشف', 'Inactive':'غير نشط', 'Ready':'جاهز',
    'Current turn':'الدور الحالي', 'At capacity':'بلغ الحد', 'No items yet':'لا توجد عناصر بعد',
    'Set turn':'تعيين الدور', 'Player photo':'صورة اللاعب', 'Upload photo':'رفع الصورة', 'Remove photo':'إزالة الصورة',
    'Remove player':'إزالة اللاعب', 'Wheel item':'عنصر العجلة', 'Create a new item':'إنشاء عنصر جديد', 'New item name':'اسم العنصر الجديد',
    'Assign item':'توزيع عنصر', 'Return to wheel':'إعادة إلى العجلة', 'Copy to wheel':'نسخ إلى العجلة',
    'Remove':'إزالة', 'Clear player items':'مسح عناصر اللاعب', 'No assigned items.':'لا توجد عناصر موزعة.',
    'No players to show.':'لا يوجد لاعبون لعرضهم.', 'No eligible player':'لا يوجد لاعب مؤهل', 'WHEEL EMPTY':'العجلة فارغة',
    'Add the first item to this wheel.':'أضف أول عنصر إلى هذه العجلة.',
    'Add players to enable spins and show their cards on the live wheel.':'أضف لاعبين لتشغيل العجلة وإظهار بطاقاتهم.',
    'Restore removed items':'استعادة العناصر المحذوفة', 'Restore':'استعادة', 'Return player items':'إعادة عناصر اللاعبين',
    'Reset wheel and players':'إعادة ضبط العجلة واللاعبين', 'Clear player collections':'مسح مجموعات اللاعبين',
    'Boxes':'الصناديق', 'Box':'الصندوق', 'Challenge':'التحدي', 'Challenge text':'نص التحدي', 'Box number':'رقم الصندوق',
    '+ Add box':'＋ إضافة صندوق', 'Add box':'إضافة صندوق', 'Save box':'حفظ الصندوق', 'Sealed':'مغلق', 'Revealed':'مكشوف',
    'Seal':'إغلاق', 'Reveal':'كشف', 'Seal all boxes':'إغلاق جميع الصناديق', 'Shuffle challenges':'خلط التحديات',
    'Clear event':'مسح الفعالية', 'Mark revealed quietly':'كشف بدون حركة', 'Remove box':'إزالة الصندوق',
    'Use an existing challenge':'استخدام تحدٍ محفوظ', 'Assign challenge':'تعيين التحدي',
    'Restart scratch layer':'إعادة طبقة الخدش', 'Add the first box to this event.':'أضف أول صندوق إلى هذه الفعالية.',
    'Activity':'النشاط', 'Type':'النوع', 'Created':'تاريخ الإنشاء', 'Last activity':'آخر نشاط',
    'All games':'كل الألعاب', 'All statuses':'كل الحالات', 'No challenges match these filters.':'لا توجد تحديات تطابق هذه الفلاتر.',
    'Default player limit (0 = unlimited)':'الحد الافتراضي للاعب (٠ = غير محدود)', 'Spin duration (ms)':'مدة الدوران (مللي ثانية)',
    'Friction (0.35–4)':'الاحتكاك (٠٫٣٥–٤)', 'Drag sensitivity (0.4–2)':'حساسية السحب (٠٫٤–٢)',
    'Click momentum':'قوة النقر', 'Maximum speed':'السرعة القصوى', 'Automatic turns':'تناوب الأدوار تلقائيًا',
    'Accept results':'قبول النتائج', 'Confirm each result':'تأكيد كل نتيجة', 'Assign automatically':'التوزيع تلقائيًا',
    'Box opening duration (ms)':'مدة فتح الصندوق (مللي ثانية)', 'Opening animation':'حركة الفتح', 'Shake & pop':'اهتزاز وفتح',
    'Key unlock':'فتح بالمفتاح', 'Scratch to reveal':'اخدش للكشف', 'Scratch threshold (%)':'نسبة الخدش المطلوبة (%)',
    'Result popup duration (ms)':'مدة نافذة النتيجة (مللي ثانية)', 'Effects (0–100)':'المؤثرات (٠–١٠٠)', 'Animation':'الحركة',
    'Sound':'الصوت', 'Sound volume (%)':'مستوى الصوت (%)', 'Preview sound':'معاينة الصوت', 'Fullscreen control':'زر ملء الشاشة',
    'Preferred language':'اللغة المفضلة', 'English':'الإنجليزية', 'On':'تشغيل', 'Off':'إيقاف', 'Save':'حفظ',
    'Close':'إغلاق', 'Fullscreen':'ملء الشاشة', '↶   UNDO LAST SPIN':'↶ التراجع عن آخر دور', 'UNDO LAST SPIN':'التراجع عن آخر دور',
    'CURRENT PLAYER':'اللاعب الحالي', 'LAST RESULT':'آخر نتيجة', 'REMAINING ITEMS':'العناصر المتبقية',
    'Proposed result':'النتيجة المقترحة', 'SPIN RESULT':'نتيجة الدور', 'Accept & assign':'قبول وتوزيع', 'Spin again':'أدر مرة أخرى',
    'Waiting for reveal':'بانتظار الكشف', 'Reveal challenge':'اكشف التحدي', 'View your list':'عرض قائمتك', 'View your list ↗':'عرض قائمتك ↗',
    'Challenge checklist':'قائمة مهام التحدي', 'Back to wheel':'العودة إلى العجلة', 'Download CSV':'تنزيل CSV',
    'Print / Save as PDF':'طباعة / حفظ PDF', 'Player':'اللاعب', 'All players':'كل اللاعبين', 'Show list':'عرض القائمة',
    'completed':'مكتمل', 'Loading game…':'جارٍ تحميل اللعبة…', 'Saving…':'جارٍ الحفظ…', 'Saved.':'تم الحفظ.',
    'Result assigned.':'تم توزيع النتيجة.', 'The wheel changed. Spin again.':'تغيّرت العجلة. أدرها مرة أخرى.',
    'The wheel is empty.':'العجلة فارغة.', 'No active player has room for another item.':'لا يوجد لاعب نشط لديه مكان لعنصر آخر.',
    'No boxes have been added yet.':'لم تُضف أي صناديق بعد.', 'Connection lost. Reconnecting…':'انقطع الاتصال. جارٍ إعادة الاتصال…',
    'Fullscreen is unavailable.':'ملء الشاشة غير متاح.', 'Sign in to continue.':'سجّل الدخول للمتابعة.',
    'Incorrect username or password.':'اسم المستخدم أو كلمة المرور غير صحيحة.', 'Invalid text.':'نص غير صالح.',
    'Refresh the page and try again.':'حدّث الصفحة وحاول مرة أخرى.', 'This link is read-only.':'هذا الرابط للعرض فقط.',
    'Challenge access has expired.':'انتهت صلاحية الوصول إلى التحدي.',
    'Challenge unavailable. Open it with a valid private code or link.':'التحدي غير متاح. افتحه برمز أو رابط خاص صالح.',
    'This private code or link is invalid or has been revoked.':'الرمز أو الرابط الخاص غير صالح أو تم إلغاؤه.',
    'Too many attempts. Try again in ten minutes.':'محاولات كثيرة. حاول مرة أخرى بعد عشر دقائق.',
    'This assignment changed. Reload your list.':'تغير هذا العنصر الموزع. أعد تحميل قائمتك.',
    'This box has changed. Open it again.':'تغير الصندوق. افتحه مجددًا.',
    'The game changed in another tab. Review the refreshed state and try again.':'تغيرت اللعبة في تبويب آخر. راجع الحالة المحدثة وحاول مرة أخرى.',
    'The game changed in another tab. Close this popup and reopen it to review the latest values.':'تغيرت اللعبة في تبويب آخر. أغلق النافذة وافتحها مجددًا لمراجعة القيم.',
    'The player changed. Spin again.':'تغير اللاعب. أدر العجلة مجددًا.',
    'The selected item is no longer available. Spin again.':'العنصر المحدد غير متاح. أدر العجلة مجددًا.',
    'The result does not match the pointer. Spin again.':'النتيجة لا تطابق المؤشر. أدر العجلة مجددًا.',
    'Invalid wheel position. Spin again.':'موضع العجلة غير صالح. أدرها مجددًا.',
    'Reverse the latest spin and return its item?':'التراجع عن آخر دور وإعادة العنصر؟',
    'Reverse this spin and return its exact item?':'التراجع عن هذا الدور وإعادة العنصر نفسه؟',
    'Remove this item without returning it to the wheel?':'إزالة العنصر دون إعادته إلى العجلة؟',
    'Remove all items from this player’s collection?':'إزالة جميع عناصر هذا اللاعب؟',
    'Remove this player and their collection?':'إزالة اللاعب ومجموعته؟', 'Remove this box from the event?':'إزالة الصندوق من الفعالية؟',
    'Return all removed units to this wheel?':'إعادة جميع العناصر المحذوفة إلى هذه العجلة؟',
    'Return all assigned items to this wheel?':'إعادة جميع العناصر الموزعة إلى هذه العجلة؟',
    'Restore all items and reset turns for this wheel?':'استعادة العناصر وإعادة ضبط الأدوار؟',
    'Remove assigned items without returning them to this wheel?':'إزالة العناصر الموزعة دون إعادتها إلى العجلة؟',
    'Seal all boxes in this event?':'إغلاق كل صناديق الفعالية؟', 'Shuffle challenges across sealed boxes in this event?':'خلط التحديات بين الصناديق المغلقة؟',
    'Permanently delete all boxes and challenges in this event?':'حذف جميع صناديق وتحديات الفعالية نهائيًا؟',
    'Discard unsaved settings?':'تجاهل الإعدادات غير المحفوظة؟',
    'The game service is unavailable. Check the database connection.':'خدمة اللعبة غير متاحة. تحقق من اتصال قاعدة البيانات.',
    'Sign-in is unavailable. Check the database connection.':'تسجيل الدخول غير متاح. تحقق من اتصال قاعدة البيانات.',
    'This game no longer exists.':'هذا التحدي غير موجود.',
    'Choose a sharing permission.':'اختر صلاحية المشاركة.',
    'Choose a game type.':'اختر نوع التحدي.',
    'Invalid spin request.':'طلب الدوران غير صالح.',
    'Refresh the wheel and spin again.':'حدّث العجلة وأدرها مجددًا.',
    'Player no longer exists.':'هذا اللاعب غير موجود.',
    'Item no longer exists.':'هذا العنصر غير موجود.',
    'Enter at most 100 initial entries.':'أدخل ما لا يزيد على ١٠٠ عنصر أولي.',
    'There is no spin to undo.':'لا يوجد دور للتراجع عنه.',
    'This result was manually changed and cannot be restored safely.':'تم تعديل هذه النتيجة يدويًا وتعذرت استعادتها بأمان.',
    'That player is inactive or full.':'اللاعب غير نشط أو بلغ حد العناصر.',
    'Add at least one unit.':'أضف وحدة واحدة على الأقل.',
    'Unit no longer exists.':'هذه الوحدة غير موجودة.',
    'This unit already moved. Refresh and try again.':'تم نقل هذه الوحدة بالفعل. حدّث الصفحة وحاول مجددًا.',
    'Choose a reset type.':'اختر نوع إعادة الضبط.',
    'Challenge no longer exists.':'هذا التحدي غير موجود.',
    'Remove or reassign its boxes before deleting this challenge.':'أزل الصناديق أو غيّر تعيينها قبل حذف التحدي.',
    'Box no longer exists.':'هذا الصندوق غير موجود.',
    'Choose an existing challenge.':'اختر تحديًا محفوظًا.',
    'That box number is already in use.':'رقم الصندوق مستخدم بالفعل.',
    'This box is already sealed.':'هذا الصندوق مغلق بالفعل.',
    'Open the box first.':'افتح الصندوق أولًا.',
    'This box has already been opened.':'تم فتح هذا الصندوق بالفعل.',
    'Seal all boxes before shuffling.':'أغلق كل الصناديق قبل الخلط.',
    'The wheel setting is outside its allowed range.':'إعداد العجلة خارج النطاق المسموح.',
    'Invalid game setting.':'إعداد التحدي غير صالح.',
    'Unknown action.':'إجراء غير معروف.', 'Unknown view.':'عرض غير معروف.',
    'This action belongs in the dashboard.':'هذا الإجراء متاح من لوحة التحكم.',
    'Choose a JPEG, PNG or WebP image under 4 MB.':'اختر صورة JPEG أو PNG أو WebP بحجم أقل من ٤ ميغابايت.',
    'Choose a valid image under 16 megapixels.':'اختر صورة صالحة أقل من ١٦ ميغابكسل.',
    'The image could not be decoded.':'تعذرت قراءة الصورة.',
    'Invalid request.':'طلب غير صالح.', 'Method not allowed.':'طريقة الطلب غير مسموحة.',
    'Open the live wheel to preview and accept a result.':'افتح العجلة المباشرة لمعاينة النتيجة وقبولها.',
    'Dashboard sections':'أقسام لوحة التحكم', 'Account':'الحساب',
    'Spin accept':'قبول النتيجة', 'spin accept':'قبول النتيجة', 'checklist':'قائمة المهام',
    'game create':'إنشاء تحدٍ', 'game rename':'إعادة تسمية تحدٍ', 'game archive':'أرشفة تحدٍ', 'game share':'مشاركة تحدٍ',
    'player save':'حفظ لاعب', 'wheel add':'إضافة عنصر', 'item save':'حفظ عنصر', 'player turn':'تعيين الدور',
    'box open':'فتح صندوق', 'box close':'إغلاق صندوق', 'box reveal':'كشف الصندوق', 'box save':'حفظ صندوق',
    'Too many attempts. Try again in 15 minutes.':'محاولات كثيرة. حاول مرة أخرى بعد ١٥ دقيقة.',
    'Spin wheel':'أدر العجلة', 'Available wheel items':'العناصر المتاحة في العجلة', 'More players':'المزيد من اللاعبين',
    'Game counters':'عدادات اللعبة', 'BOLTX home':'الصفحة الرئيسية لـ BOLTX', 'Challenge Created!':'تم إنشاء التحدي!',
}));
const patterns = [
    [/^Boxes · (\d+)$/,m=>'الصناديق · '+m[1]],
    [/^BOX (\d+)$/,m=>'الصندوق '+m[1]],
    [/^Box (\d+)(.*)$/,m=>'الصندوق '+m[1]+m[2]],
    [/^Edit box #(\d+)$/,m=>'تعديل الصندوق #'+m[1]],
    [/^Restore removed units \((\d+)\)$/,m=>'استعادة العناصر المحذوفة ('+m[1]+')'],
    [/^Return (.+) to the wheel$/,m=>'أعد '+m[1]+' إلى العجلة'],
    [/^Manage (.+)$/,m=>'إدارة '+m[1]],
    [/^Enter a number between (\d+) and (\d+)\.$/,m=>'أدخل رقمًا بين '+m[1]+' و'+m[2]+'.'],
    [/^Enter text up to (\d+) characters\.$/,m=>'أدخل نصًا لا يتجاوز '+m[1]+' حرفًا.'],
    [/^Current turn:$/,()=> 'الدور الحالي:'],
    [/^· (\d+) available · Last result:$/,m=>'· '+m[1]+' متاح · آخر نتيجة:'],
    [/^· (\d+) available$/,m=>'· '+m[1]+' متاح'],
    [/^(\d+ \/ [\d∞]+) items · (.+)$/,m=>m[1]+' عناصر · '+(translations.get(m[2])||m[2])],
];
let language;
try{language=localStorage.getItem('boltx-language');}catch{}
language=language||document.body.dataset.language||'en';
export function tr(source){
    if(language!=='ar') return source;
    const key=source.trim().replace(/\s+/g,' ');
    const exact=translations.get(key);
    if(exact) return source.replace(source.trim(),exact);
    for(const [pattern,format] of patterns){
        const match=key.match(pattern);
        if(match) return source.replace(source.trim(),format(match));
    }
    return source;
}
const originals=new WeakMap();
const attrNames=['aria-label','title','placeholder'];
function scan(node){
    if(node.nodeType===Node.TEXT_NODE){
        if(!node.parentElement||node.parentElement.closest('script,style,bdi,[data-user-text],canvas,textarea,pre')) return;
        const old=originals.get(node);
        const source=old&&old.rendered===node.data?old.source:node.data;
        const rendered=language==='ar'&&node.parentElement.dataset.ar?node.parentElement.dataset.ar:tr(source);
        originals.set(node,{source,rendered});
        if(node.data!==rendered) node.data=rendered;
    }else if(node.nodeType===Node.ELEMENT_NODE){
        if(node.matches('script,style,bdi,[data-user-text],canvas,textarea,pre')) return;
        const attributes=originals.get(node)||{};
        for(const attr of attrNames) if(node.hasAttribute(attr)){
            const value=node.getAttribute(attr),old=attributes[attr],source=old&&old.rendered===value?old.source:value;
            const rendered=tr(source);
            attributes[attr]={source,rendered};
            if(rendered!==value) node.setAttribute(attr,rendered);
        }
        originals.set(node,attributes);
        for(const child of node.childNodes) scan(child);
    }
}
const switcher=document.createElement('nav');
switcher.className='language-switch';
switcher.dataset.userText='';
switcher.setAttribute('aria-label','Language / اللغة');
switcher.innerHTML='<button type="button" data-lang="en" lang="en">EN</button><button type="button" data-lang="ar" lang="ar">عربي</button>';
document.body.appendChild(switcher);
function apply(){
    document.documentElement.lang=language;
    document.documentElement.dir=language==='ar'?'rtl':'ltr';
    for(const b of switcher.children) b.setAttribute('aria-pressed',String(b.dataset.lang===language));
    scan(document.body);
}
switcher.onclick=e=>{
    const next=e.target.closest('[data-lang]')?.dataset.lang;
    if(!next) return;
    language=next;
    try{localStorage.setItem('boltx-language',next);}catch{}
    apply();
};
apply();
new MutationObserver(records=>{
    for(const r of records){
        if(r.type==='childList') for(const node of r.addedNodes) scan(node);
        else scan(r.target);
    }
}).observe(document.body,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:attrNames});
