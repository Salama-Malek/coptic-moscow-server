import bcrypt from 'bcrypt';
import { pool } from './pool';
import dotenv from 'dotenv';

dotenv.config();

const BCRYPT_ROUNDS = 12;

async function seedAdmins(): Promise<void> {
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM admins');
  const count = (rows as Array<{ count: number }>)[0].count;
  if (count > 0) return;

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.error('[seed] ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set to bootstrap the first admin.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await pool.execute(
    `INSERT INTO admins (display_name, email, password_hash, role, language, must_change_password)
     VALUES (?, ?, ?, 'super_admin', 'ar', 1)`,
    ['الراهب القمص داود الأنطوني', email, hash]
  );
  console.warn('[seed] ⚠ Bootstrap super_admin created. Change the password immediately after first login!');
}

async function seedSnippets(): Promise<void> {
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM snippets');
  const count = (rows as Array<{ count: number }>)[0].count;
  if (count > 0) return;

  const snippets = [
    {
      key: 'opening',
      value_ar: 'ان احيانا الرب وعشنا',
      value_ru: 'Если Господь даст нам жизнь',
      value_en: 'If the Lord grants us life',
    },
    {
      key: 'closing_short',
      value_ar: 'كل عام وانتم بخير',
      value_ru: 'С праздником!',
      value_en: 'Blessed feast!',
    },
    {
      key: 'closing_long',
      value_ar: 'ربنا يبارك حياتكم وينمي الخدمة لأجل أسمه القدوس صلواتكم! كل عام وانتم بخير',
      value_ru: 'Да благословит Господь вашу жизнь и приумножит служение во имя Его святое. Ваши молитвы! С праздником!',
      value_en: 'May the Lord bless your lives and grow the ministry for His holy name. Your prayers! Blessed feast!',
    },
    {
      key: 'disclaimer_standard',
      value_ar: 'ملحوظة: في حالة اضافة او الغاء او تغيير اي موعد لأي ظرف سنكتب هنا علي قناة الكنيسة، ولذا من الضروري متابعة القناة.',
      value_ru: 'Примечание: в случае добавления, отмены или изменения любого расписания мы напишем здесь, на канале церкви. Поэтому необходимо следить за каналом.',
      value_en: 'Note: In case of any additions, cancellations, or schedule changes, we will post here on the church channel. Please follow the channel.',
    },
  ];

  for (const s of snippets) {
    await pool.execute(
      'INSERT INTO snippets (`key`, value_ar, value_ru, value_en) VALUES (?, ?, ?, ?)',
      [s.key, s.value_ar, s.value_ru, s.value_en]
    );
  }
  console.log('[seed] Snippets seeded.');
}

async function seedTemplates(): Promise<void> {
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM announcement_templates');
  const count = (rows as Array<{ count: number }>)[0].count;
  if (count > 0) return;

  const basePlaceholders = [
    { key: 'day_name_ar', label_ar: 'اليوم', label_ru: 'День', label_en: 'Day', type: 'text', default: 'الأحد' },
    { key: 'gregorian_date', label_ar: 'التاريخ', label_ru: 'Дата', label_en: 'Date', type: 'date' },
    { key: 'occasion', label_ar: 'المناسبة', label_ru: 'Повод', label_en: 'Occasion', type: 'text', optional: true },
    { key: 'time_from', label_ar: 'من الساعة', label_ru: 'С', label_en: 'From', type: 'time' },
    { key: 'time_to', label_ar: 'إلى الساعة', label_ru: 'До', label_en: 'To', type: 'time' },
    { key: 'celebrant', label_ar: 'الكاهن', label_ru: 'Священник', label_en: 'Celebrant', type: 'text', optional: true },
    { key: 'include_disclaimer', label_ar: 'إضافة الملحوظة', label_ru: 'Добавить примечание', label_en: 'Include note', type: 'boolean', default: true },
  ];

  const templates = [
    // Template 1: Weekday Liturgy
    {
      name_ar: 'قداس يوم أسبوع',
      name_ru: 'Будничная литургия',
      name_en: 'Weekday Liturgy',
      category: 'liturgy',
      body_ar_template:
        '{{snippet:opening}} القداس الالهي {{day_name_ar}} {{gregorian_date}}{{#if occasion}} ({{occasion}}){{/if}} من {{time_from}} الي {{time_to}}{{#if celebrant}} يصلي القداس {{celebrant}}{{/if}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      body_ru_template:
        '{{snippet:opening}} Божественная литургия {{day_name_ar}} {{gregorian_date}}{{#if occasion}} ({{occasion}}){{/if}} с {{time_from}} до {{time_to}}{{#if celebrant}} Служит {{celebrant}}{{/if}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      body_en_template:
        '{{snippet:opening}} Divine Liturgy {{day_name_ar}} {{gregorian_date}}{{#if occasion}} ({{occasion}}){{/if}} from {{time_from}} to {{time_to}}{{#if celebrant}} Celebrated by {{celebrant}}{{/if}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      placeholders: JSON.stringify(basePlaceholders),
    },
    // Template 2: Liturgy with H.G. Bishop Daniel
    {
      name_ar: 'قداس مع نيافة الأنبا دانيال',
      name_ru: 'Литургия с Его Преосвященством Епископом Даниилом',
      name_en: 'Liturgy with H.G. Bishop Daniel',
      category: 'liturgy',
      body_ar_template:
        '{{snippet:opening}} القداس الالهي {{day_name_ar}} {{gregorian_date}}{{#if occasion}} ({{occasion}}){{/if}} من {{time_from}} الي {{time_to}} يصلي القداس {{celebrant}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      body_ru_template:
        '{{snippet:opening}} Божественная литургия {{day_name_ar}} {{gregorian_date}}{{#if occasion}} ({{occasion}}){{/if}} с {{time_from}} до {{time_to}} Служит {{celebrant}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      body_en_template:
        '{{snippet:opening}} Divine Liturgy {{day_name_ar}} {{gregorian_date}}{{#if occasion}} ({{occasion}}){{/if}} from {{time_from}} to {{time_to}} Celebrated by {{celebrant}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      placeholders: JSON.stringify([
        { key: 'day_name_ar', label_ar: 'اليوم', label_ru: 'День', label_en: 'Day', type: 'text', default: 'الأحد' },
        { key: 'gregorian_date', label_ar: 'التاريخ', label_ru: 'Дата', label_en: 'Date', type: 'date' },
        { key: 'occasion', label_ar: 'المناسبة', label_ru: 'Повод', label_en: 'Occasion', type: 'text', optional: true },
        { key: 'time_from', label_ar: 'من الساعة', label_ru: 'С', label_en: 'From', type: 'time' },
        { key: 'time_to', label_ar: 'إلى الساعة', label_ru: 'До', label_en: 'To', type: 'time' },
        {
          key: 'celebrant',
          label_ar: 'الكاهن',
          label_ru: 'Священник',
          label_en: 'Celebrant',
          type: 'text',
          default: 'صاحب النيافة الحبر الجليل جزيل الاحترام نيافة الأنبا دانيال رئيس دير الأنبا بولا',
        },
        { key: 'include_disclaimer', label_ar: 'إضافة الملحوظة', label_ru: 'Добавить примечание', label_en: 'Include note', type: 'boolean', default: true },
      ]),
    },
    // Template 3: Saturday Vespers + Sunday Liturgy
    {
      name_ar: 'عشية وقداس الأحد',
      name_ru: 'Субботняя вечерня и воскресная литургия',
      name_en: 'Saturday Vespers + Sunday Liturgy',
      category: 'vespers',
      body_ar_template:
        '{{snippet:opening}}\nالسبت {{saturday_date}} عشية وتسبحة نصف الليل من {{vespers_time}} مساء\nالأحد {{sunday_date}} القداس الالهي من {{liturgy_time}} صباحا يليه {{follows}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      body_ru_template:
        '{{snippet:opening}}\nСуббота {{saturday_date}} Вечерня и полунощница с {{vespers_time}} вечера\nВоскресенье {{sunday_date}} Божественная литургия с {{liturgy_time}} утра, после чего {{follows}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      body_en_template:
        '{{snippet:opening}}\nSaturday {{saturday_date}} Vespers and Midnight Praises from {{vespers_time}} PM\nSunday {{sunday_date}} Divine Liturgy from {{liturgy_time}} AM followed by {{follows}}\n{{#if include_disclaimer}}\n{{snippet:disclaimer_standard}}{{/if}}\n{{snippet:closing_short}}',
      placeholders: JSON.stringify([
        { key: 'saturday_date', label_ar: 'تاريخ السبت', label_ru: 'Дата субботы', label_en: 'Saturday date', type: 'date' },
        { key: 'vespers_time', label_ar: 'وقت العشية', label_ru: 'Время вечерни', label_en: 'Vespers time', type: 'time' },
        { key: 'sunday_date', label_ar: 'تاريخ الأحد', label_ru: 'Дата воскресенья', label_en: 'Sunday date', type: 'date' },
        { key: 'liturgy_time', label_ar: 'وقت القداس', label_ru: 'Время литургии', label_en: 'Liturgy time', type: 'time' },
        {
          key: 'follows',
          label_ar: 'يليه',
          label_ru: 'Далее',
          label_en: 'Followed by',
          type: 'text',
          default: 'اغابي صغيرة ثم مدارس الأحد واجتماع الشباب',
        },
        { key: 'include_disclaimer', label_ar: 'إضافة الملحوظة', label_ru: 'Добавить примечание', label_en: 'Include note', type: 'boolean', default: true },
      ]),
    },
    // Template 4: Two-week schedule
    {
      name_ar: 'جدول أسبوعين',
      name_ru: 'Расписание на две недели',
      name_en: 'Two-week schedule',
      category: 'liturgy',
      body_ar_template:
        '{{snippet:opening}}\n\nالأسبوع الأول:\nالسبت {{w1_saturday_date}} عشية من {{w1_vespers_time}} مساء\nالأحد {{w1_sunday_date}} القداس الالهي من {{w1_liturgy_time}} صباحا{{#if w1_occasion}} — {{w1_occasion}}{{/if}}\n\nالأسبوع الثاني:\nالسبت {{w2_saturday_date}} عشية من {{w2_vespers_time}} مساء\nالأحد {{w2_sunday_date}} القداس الالهي من {{w2_liturgy_time}} صباحا{{#if w2_occasion}} — {{w2_occasion}}{{/if}}\n\n{{snippet:disclaimer_standard}}\n{{snippet:closing_short}}',
      body_ru_template:
        '{{snippet:opening}}\n\nПервая неделя:\nСуббота {{w1_saturday_date}} Вечерня с {{w1_vespers_time}} вечера\nВоскресенье {{w1_sunday_date}} Божественная литургия с {{w1_liturgy_time}} утра{{#if w1_occasion}} — {{w1_occasion}}{{/if}}\n\nВторая неделя:\nСуббота {{w2_saturday_date}} Вечерня с {{w2_vespers_time}} вечера\nВоскресенье {{w2_sunday_date}} Божественная литургия с {{w2_liturgy_time}} утра{{#if w2_occasion}} — {{w2_occasion}}{{/if}}\n\n{{snippet:disclaimer_standard}}\n{{snippet:closing_short}}',
      body_en_template:
        '{{snippet:opening}}\n\nWeek One:\nSaturday {{w1_saturday_date}} Vespers from {{w1_vespers_time}} PM\nSunday {{w1_sunday_date}} Divine Liturgy from {{w1_liturgy_time}} AM{{#if w1_occasion}} — {{w1_occasion}}{{/if}}\n\nWeek Two:\nSaturday {{w2_saturday_date}} Vespers from {{w2_vespers_time}} PM\nSunday {{w2_sunday_date}} Divine Liturgy from {{w2_liturgy_time}} AM{{#if w2_occasion}} — {{w2_occasion}}{{/if}}\n\n{{snippet:disclaimer_standard}}\n{{snippet:closing_short}}',
      placeholders: JSON.stringify([
        { key: 'w1_saturday_date', label_ar: 'سبت الأسبوع الأول', label_ru: 'Суббота 1-й недели', label_en: 'Week 1 Saturday date', type: 'date' },
        { key: 'w1_vespers_time', label_ar: 'وقت عشية الأسبوع الأول', label_ru: 'Время вечерни 1-й недели', label_en: 'Week 1 Vespers time', type: 'time' },
        { key: 'w1_sunday_date', label_ar: 'أحد الأسبوع الأول', label_ru: 'Воскресенье 1-й недели', label_en: 'Week 1 Sunday date', type: 'date' },
        { key: 'w1_liturgy_time', label_ar: 'وقت قداس الأسبوع الأول', label_ru: 'Время литургии 1-й недели', label_en: 'Week 1 Liturgy time', type: 'time' },
        { key: 'w1_occasion', label_ar: 'مناسبة الأسبوع الأول', label_ru: 'Повод 1-й недели', label_en: 'Week 1 occasion', type: 'text', optional: true },
        { key: 'w2_saturday_date', label_ar: 'سبت الأسبوع الثاني', label_ru: 'Суббота 2-й недели', label_en: 'Week 2 Saturday date', type: 'date' },
        { key: 'w2_vespers_time', label_ar: 'وقت عشية الأسبوع الثاني', label_ru: 'Время вечерни 2-й недели', label_en: 'Week 2 Vespers time', type: 'time' },
        { key: 'w2_sunday_date', label_ar: 'أحد الأسبوع الثاني', label_ru: 'Воскресенье 2-й недели', label_en: 'Week 2 Sunday date', type: 'date' },
        { key: 'w2_liturgy_time', label_ar: 'وقت قداس الأسبوع الثاني', label_ru: 'Время литургии 2-й недели', label_en: 'Week 2 Liturgy time', type: 'time' },
        { key: 'w2_occasion', label_ar: 'مناسبة الأسبوع الثاني', label_ru: 'Повод 2-й недели', label_en: 'Week 2 occasion', type: 'text', optional: true },
      ]),
    },
  ];

  for (const t of templates) {
    await pool.execute(
      `INSERT INTO announcement_templates
        (name_ar, name_ru, name_en, category, body_ar_template, body_ru_template, body_en_template, placeholders)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.name_ar, t.name_ru, t.name_en, t.category, t.body_ar_template, t.body_ru_template, t.body_en_template, t.placeholders]
    );
  }
  console.log('[seed] Announcement templates seeded (4 templates).');
}

interface CalendarEventSeed {
  title_ar: string;
  title_ru: string;
  title_en: string;
  description_ar: string | null;
  description_ru: string | null;
  description_en: string | null;
  rrule: string | null;
  starts_at: string | null;
  duration_minutes: number;
  reminder_minutes_before: number;
  active: number;
}

async function seedCalendarEvents(): Promise<void> {
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM calendar_events');
  const count = (rows as Array<{ count: number }>)[0].count;
  if (count > 0) return;

  const events: CalendarEventSeed[] = [
    // Weekly recurring — always active, with real start times
    {
      title_ar: 'القداس الإلهي - الأحد',
      title_ru: 'Божественная литургия - Воскресенье',
      title_en: 'Sunday Divine Liturgy',
      description_ar: null,
      description_ru: null,
      description_en: null,
      rrule: 'FREQ=WEEKLY;BYDAY=SU',
      starts_at: '2026-01-04 09:00:00', // a Sunday
      duration_minutes: 180,
      reminder_minutes_before: 30,
      active: 1,
    },
    {
      title_ar: 'عشية السبت',
      title_ru: 'Суббота вечерня',
      title_en: 'Saturday Vespers',
      description_ar: null,
      description_ru: null,
      description_en: null,
      rrule: 'FREQ=WEEKLY;BYDAY=SA',
      starts_at: '2026-01-03 17:00:00', // a Saturday
      duration_minutes: 120,
      reminder_minutes_before: 30,
      active: 1,
    },

    // Fixed-date annual events
    {
      title_ar: 'عيد النيروز',
      title_ru: 'Праздник Найруз',
      title_en: 'Nayrouz (Coptic New Year)',
      description_ar: null,
      description_ru: null,
      description_en: null,
      rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=11',
      starts_at: '2026-09-11 09:00:00',
      duration_minutes: 180,
      reminder_minutes_before: 60,
      active: 1,
    },
    {
      title_ar: 'عيد الصليب',
      title_ru: 'Праздник Креста',
      title_en: 'Feast of the Cross',
      description_ar: null,
      description_ru: null,
      description_en: null,
      rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=27',
      starts_at: '2026-09-27 09:00:00',
      duration_minutes: 180,
      reminder_minutes_before: 60,
      active: 1,
    },
    {
      title_ar: 'صوم العذراء',
      title_ru: 'Пост Богородицы',
      title_en: 'Virgin Mary Fast',
      description_ar: '٧ - ٢١ أغسطس',
      description_ru: '7–21 августа',
      description_en: 'August 7–21',
      rrule: 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=7',
      starts_at: '2026-08-07 00:00:00',
      duration_minutes: 0, // informational
      reminder_minutes_before: 0,
      active: 1,
    },
    {
      title_ar: 'صوم الميلاد',
      title_ru: 'Рождественский пост',
      title_en: 'Nativity Fast',
      description_ar: '٢٥ نوفمبر - ٦ يناير',
      description_ru: '25 ноября – 6 января',
      description_en: 'November 25 – January 6',
      rrule: 'FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=25',
      starts_at: '2026-11-25 00:00:00',
      duration_minutes: 0,
      reminder_minutes_before: 0,
      active: 1,
    },

    // Moveable feasts — admin must set dates each year (Coptic Paschalion)
    // Seeded with active=0 and starts_at=NULL
    {
      title_ar: 'صوم يونان',
      title_ru: 'Пост Ионы',
      title_en: 'Jonah Fast',
      description_ar: 'يحدد سنويا حسب الباسخالية القبطية',
      description_ru: 'Дата определяется ежегодно по Коптской Пасхалии',
      description_en: 'Date set yearly per Coptic Paschalion',
      rrule: null,
      starts_at: null,
      duration_minutes: 0,
      reminder_minutes_before: 0,
      active: 0,
    },
    {
      title_ar: 'الصوم الكبير',
      title_ru: 'Великий пост',
      title_en: 'Great Lent',
      description_ar: 'يحدد سنويا حسب الباسخالية القبطية',
      description_ru: 'Дата определяется ежегодно по Коптской Пасхалии',
      description_en: 'Date set yearly per Coptic Paschalion',
      rrule: null,
      starts_at: null,
      duration_minutes: 0,
      reminder_minutes_before: 0,
      active: 0,
    },
    {
      title_ar: 'صوم الرسل',
      title_ru: 'Апостольский пост',
      title_en: 'Apostles\' Fast',
      description_ar: 'يحدد سنويا حسب الباسخالية القبطية',
      description_ru: 'Дата определяется ежегодно по Коптской Пасхалии',
      description_en: 'Date set yearly per Coptic Paschalion',
      rrule: null,
      starts_at: null,
      duration_minutes: 0,
      reminder_minutes_before: 0,
      active: 0,
    },
    {
      title_ar: 'تسبحة كيهك',
      title_ru: 'Псалмодия Кияхк',
      title_en: 'Kiahk Praises',
      description_ar: 'تفعل يدويا خلال شهر كيهك (حوالي ١٠ ديسمبر - ٨ يناير)',
      description_ru: 'Активируется вручную в месяц Кияхк (примерно 10 декабря – 8 января)',
      description_en: 'Manually activated during the month of Kiahk (~Dec 10 – Jan 8)',
      rrule: 'FREQ=WEEKLY;BYDAY=SA',
      starts_at: null, // admin sets the first Saturday of Kiahk season
      duration_minutes: 180,
      reminder_minutes_before: 30,
      active: 0,
    },
  ];

  for (const e of events) {
    await pool.execute(
      `INSERT INTO calendar_events
        (title_ar, title_ru, title_en, description_ar, description_ru, description_en, rrule, starts_at, duration_minutes, reminder_minutes_before, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.title_ar,
        e.title_ru,
        e.title_en,
        e.description_ar,
        e.description_ru,
        e.description_en,
        e.rrule,
        e.starts_at,
        e.duration_minutes,
        e.reminder_minutes_before,
        e.active,
      ]
    );
  }
  console.log('[seed] Calendar events seeded (10 events: 2 weekly, 4 fixed-date, 4 moveable/manual).');
}

export async function runSeeds(): Promise<void> {
  await seedAdmins();
  await seedSnippets();
  await seedTemplates();
  await seedCalendarEvents();
  console.log('[seed] All seeds complete.');
}

// Allow running directly: npx tsx src/db/seed.ts
if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[seed] Failed:', err);
      process.exit(1);
    });
}
