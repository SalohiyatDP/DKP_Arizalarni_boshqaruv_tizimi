/**
 * @file SeedData.js
 * @fileoverview One-off setup/seed routine for the DKP system. Creates every
 *               sheet from SCHEMA and fills reference + demo data so the Web App
 *               is immediately usable. Mirrors samples/DKP_Namuna.xlsx.
 *
 * Usage (Apps Script editor): run `seedSampleData()` once after setting the
 * `DKP_SPREADSHEET_ID` Script Property. Login passwords are hashed at runtime
 * with Security.hashPassword, so the seeded accounts authenticate normally.
 *
 * Demo accounts (parol):
 *   admin / Admin@123        (ADMIN)
 *   region / Region@123      (REGION)
 *   district / District@123  (DISTRICT)
 *   engineer / Engineer@123  (ENGINEER)
 *
 * Apps Script only.
 */

/* eslint-disable no-unused-vars */

/**
 * Creates all sheets and seeds reference + demo data.
 * @return {!Object} Summary of seeded row counts per sheet.
 */
function seedSampleData() {
  return Database.withLock(function () {
    Database.setupAll();

    const now = new Date();
    const summary = {};

    /**
     * Builds a LOGIN record with a freshly salted hash.
     * @param {string} username Username.
     * @param {string} password Plain password.
     * @param {string} employeeId Linked employee id.
     * @param {string} role Role code.
     * @return {!Object} LOGIN record.
     */
    function user(username, password, employeeId, role) {
      const salt = Security.generateSalt();
      return {
        username: username,
        passwordHash: Security.hashPassword(password, salt),
        salt: salt,
        employeeId: employeeId,
        role: role,
        status: CONFIG.USER_STATUS.ACTIVE,
        failedAttempts: 0,
        lockedUntil: null,
        lastLogin: null,
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    const seeds = {};

    seeds[CONFIG.SHEETS.EMPLOYEES] = [
      { employeeId: 'E-001', fullName: 'Karimov Akmal', role: CONFIG.ROLES.ADMIN, region: '', district: '', branch: '', phone: '+998901112233', active: true },
      { employeeId: 'E-100', fullName: 'Rasulov Sherzod', role: CONFIG.ROLES.REGION, region: 'Toshkent shahri', district: '', branch: '', phone: '+998901112234', active: true },
      { employeeId: 'E-200', fullName: 'Tursunov Otabek', role: CONFIG.ROLES.DISTRICT, region: 'Toshkent shahri', district: 'Chilonzor', branch: 'Chilonzor filiali', phone: '+998901112235', active: true },
      { employeeId: 'E-301', fullName: 'Aliyev Bobur', role: CONFIG.ROLES.ENGINEER, region: 'Toshkent shahri', district: 'Chilonzor', branch: 'Chilonzor filiali', phone: '+998901112236', active: true },
      { employeeId: 'E-302', fullName: 'Yusupova Dilnoza', role: CONFIG.ROLES.ENGINEER, region: 'Toshkent shahri', district: 'Yunusobod', branch: 'Yunusobod filiali', phone: '+998901112237', active: true },
      { employeeId: 'E-303', fullName: 'Saidov Jasur', role: CONFIG.ROLES.ENGINEER, region: 'Samarqand', district: 'Samarqand shahri', branch: 'Samarqand filiali', phone: '+998901112238', active: true },
    ];

    seeds[CONFIG.SHEETS.LOGIN] = [
      user('admin', 'Admin@123', 'E-001', CONFIG.ROLES.ADMIN),
      user('region', 'Region@123', 'E-100', CONFIG.ROLES.REGION),
      user('district', 'District@123', 'E-200', CONFIG.ROLES.DISTRICT),
      user('engineer', 'Engineer@123', 'E-301', CONFIG.ROLES.ENGINEER),
    ];

    seeds[CONFIG.SHEETS.HOLIDAYS] = [
      { date: new Date(2026, 0, 1), name: 'Yangi yil', recurring: true },
      { date: new Date(2026, 0, 14), name: 'Vatan himoyachilari kuni', recurring: true },
      { date: new Date(2026, 2, 8), name: 'Xotin-qizlar kuni', recurring: true },
      { date: new Date(2026, 2, 21), name: 'Navro\'z bayrami', recurring: true },
      { date: new Date(2026, 4, 9), name: 'Xotira va qadrlash kuni', recurring: true },
      { date: new Date(2026, 8, 1), name: 'Mustaqillik kuni', recurring: true },
      { date: new Date(2026, 9, 1), name: 'O\'qituvchi va murabbiylar kuni', recurring: true },
      { date: new Date(2026, 11, 8), name: 'Konstitutsiya kuni', recurring: true },
      { date: new Date(2026, 2, 20), name: 'Ramazon hayiti (2026)', recurring: false },
      { date: new Date(2026, 4, 27), name: 'Qurbon hayiti (2026)', recurring: false },
    ];

    seeds[CONFIG.SHEETS.SERVICE_RULES] = [
      { serviceType: 'Yangi kadastr ishi', workingDays: 15, price: 500000, active: true },
      { serviceType: 'O\'zgartirish kiritish', workingDays: 7, price: 250000, active: true },
      { serviceType: 'Ko\'chmas mulkni ro\'yxatga olish', workingDays: 10, price: 350000, active: true },
      { serviceType: 'Yer uchastkasi rasmiylashtiruvi', workingDays: 20, price: 750000, active: true },
      { serviceType: 'Texnik pasport tayyorlash', workingDays: 5, price: 150000, active: true },
    ];

    seeds[CONFIG.SHEETS.AREA_RULES] = [
      { region: 'Toshkent shahri', district: 'Chilonzor', branch: 'Chilonzor filiali', active: true },
      { region: 'Toshkent shahri', district: 'Yunusobod', branch: 'Yunusobod filiali', active: true },
      { region: 'Samarqand', district: 'Samarqand shahri', branch: 'Samarqand filiali', active: true },
      { region: 'Farg\'ona', district: 'Farg\'ona shahri', branch: 'Farg\'ona filiali', active: true },
    ];

    seeds[CONFIG.SHEETS.SETTINGS] = [
      { key: 'APP_NAME', value: CONFIG.APP.NAME, description: 'Tizim nomi' },
      { key: 'DEFAULT_SLA_DAYS', value: '15', description: 'Standart muddat (ish kuni)' },
      { key: 'SESSION_TTL_MINUTES', value: String(CONFIG.SECURITY.SESSION_TTL_MINUTES), description: 'Sessiya muddati (daqiqa)' },
      { key: 'ITEMS_PER_PAGE', value: String(CONFIG.PERFORMANCE.PAGE_SIZE), description: 'Sahifadagi yozuvlar soni' },
      { key: 'CURRENCY', value: 'UZS', description: 'Valyuta' },
    ];

    Object.keys(seeds).forEach(function (sheetName) {
      const repo = new BaseRepository(sheetName);
      repo.replaceAll(seeds[sheetName]);
      summary[sheetName] = seeds[sheetName].length;
    });

    AppLogger.logAction('system', 'SEED_SAMPLE_DATA', summary);
    return summary;
  });
}
