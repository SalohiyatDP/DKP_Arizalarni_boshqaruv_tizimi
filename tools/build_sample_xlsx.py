#!/usr/bin/env python3
"""Generate a multi-sheet sample workbook (DKP_Namuna.xlsx) for the DKP system.

Dependency-free: builds a valid OOXML (.xlsx) package using only the standard
library (zipfile + hand-written XML). Upload the result to Google Drive and it
converts cleanly into a Google Sheets workbook with all 16 tabs.

Login password hashes are computed with the SAME algorithm as the Apps Script
`Security.hashPassword`:  sha256(salt + ':' + password) -> lowercase hex.
So the seeded accounts will actually authenticate once AuthService is built.
"""

import datetime
import hashlib
import html
import os
import zipfile

EPOCH = datetime.datetime(1899, 12, 30)


def serial(dt):
    """Excel date/datetime serial number (days since 1899-12-30)."""
    if isinstance(dt, datetime.datetime):
        delta = dt - EPOCH
        return delta.days + delta.seconds / 86400.0
    delta = datetime.datetime(dt.year, dt.month, dt.day) - EPOCH
    return delta.days


def pw(salt, password):
    """Salted SHA-256 hash matching Security.hashPassword."""
    return hashlib.sha256((salt + ':' + password).encode('utf-8')).hexdigest()


def col_letter(n):
    """1-based column index -> spreadsheet column letters."""
    s = ''
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


# Style indices defined in styles.xml below.
S_DEFAULT, S_DATE, S_HEADER, S_DATETIME = 0, 1, 2, 3

D = datetime.date
DT = datetime.datetime
NOW = DT(2026, 6, 27, 9, 30, 0)

# Reproducible salts for the seeded accounts.
SALTS = {
    'admin': 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    'region': 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7',
    'district': 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
    'engineer': 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
}

# ---------------------------------------------------------------------------
# Sheet definitions: name -> (headers, rows)
# Headers MUST match src/config/Schema.js exactly.
# ---------------------------------------------------------------------------
SHEETS = []


def add(name, headers, rows):
    SHEETS.append((name, headers, rows))


add('LOGIN',
    ['Username', 'PasswordHash', 'Salt', 'EmployeeID', 'Role', 'Status',
     'FailedAttempts', 'LockedUntil', 'LastLogin', 'MustChangePassword',
     'CreatedAt', 'UpdatedAt'],
    [
        ['admin', pw(SALTS['admin'], 'Admin@123'), SALTS['admin'], 'E-001',
         'ADMIN', 'ACTIVE', 0, '', '', True, NOW, NOW],
        ['region', pw(SALTS['region'], 'Region@123'), SALTS['region'], 'E-100',
         'REGION', 'ACTIVE', 0, '', '', True, NOW, NOW],
        ['district', pw(SALTS['district'], 'District@123'), SALTS['district'],
         'E-200', 'DISTRICT', 'ACTIVE', 0, '', '', True, NOW, NOW],
        ['engineer', pw(SALTS['engineer'], 'Engineer@123'), SALTS['engineer'],
         'E-301', 'ENGINEER', 'ACTIVE', 0, '', '', True, NOW, NOW],
    ])

add('EMPLOYEES',
    ['EmployeeID', 'FullName', 'Role', 'Region', 'District', 'Branch', 'Phone',
     'Active'],
    [
        ['E-001', 'Karimov Akmal', 'ADMIN', '', '', '', '+998901112233', True],
        ['E-100', 'Rasulov Sherzod', 'REGION', 'Toshkent shahri', '', '',
         '+998901112234', True],
        ['E-200', 'Tursunov Otabek', 'DISTRICT', 'Toshkent shahri', 'Chilonzor',
         'Chilonzor filiali', '+998901112235', True],
        ['E-301', 'Aliyev Bobur', 'ENGINEER', 'Toshkent shahri', 'Chilonzor',
         'Chilonzor filiali', '+998901112236', True],
        ['E-302', 'Yusupova Dilnoza', 'ENGINEER', 'Toshkent shahri', 'Yunusobod',
         'Yunusobod filiali', '+998901112237', True],
        ['E-303', 'Saidov Jasur', 'ENGINEER', 'Samarqand', 'Samarqand shahri',
         'Samarqand filiali', '+998901112238', True],
    ])

add('HOLIDAYS',
    ['Date', 'Name', 'RecurringYearly'],
    [
        [D(2026, 1, 1), 'Yangi yil', True],
        [D(2026, 1, 14), 'Vatan himoyachilari kuni', True],
        [D(2026, 3, 8), 'Xotin-qizlar kuni', True],
        [D(2026, 3, 21), "Navro'z bayrami", True],
        [D(2026, 5, 9), 'Xotira va qadrlash kuni', True],
        [D(2026, 9, 1), 'Mustaqillik kuni', True],
        [D(2026, 10, 1), "O'qituvchi va murabbiylar kuni", True],
        [D(2026, 12, 8), 'Konstitutsiya kuni', True],
        [D(2026, 3, 20), "Ramazon hayiti (2026)", False],
        [D(2026, 5, 27), 'Qurbon hayiti (2026)', False],
    ])

add('SERVICE_RULES',
    ['ServiceType', 'WorkingDays', 'Price', 'Active'],
    [
        ['Yangi kadastr ishi', 15, 500000, True],
        ["O'zgartirish kiritish", 7, 250000, True],
        ["Ko'chmas mulkni ro'yxatga olish", 10, 350000, True],
        ['Yer uchastkasi rasmiylashtiruvi', 20, 750000, True],
        ['Texnik pasport tayyorlash', 5, 150000, True],
    ])

add('AREA_RULES',
    ['Region', 'District', 'Branch', 'Active'],
    [
        ['Toshkent shahri', 'Chilonzor', 'Chilonzor filiali', True],
        ['Toshkent shahri', 'Yunusobod', 'Yunusobod filiali', True],
        ['Samarqand', 'Samarqand shahri', 'Samarqand filiali', True],
        ["Farg'ona", "Farg'ona shahri", "Farg'ona filiali", True],
    ])

add('SETTINGS',
    ['Key', 'Value', 'Description'],
    [
        ['APP_NAME', 'DKP Arizalarni Boshqaruv Tizimi', 'Tizim nomi'],
        ['DEFAULT_SLA_DAYS', '15', 'Standart muddat (ish kuni)'],
        ['SESSION_TTL_MINUTES', '120', 'Sessiya amal qilish muddati (daqiqa)'],
        ['ITEMS_PER_PAGE', '50', 'Sahifadagi yozuvlar soni'],
        ['CURRENCY', 'UZS', 'Valyuta'],
        ['MAX_FAILED_LOGINS', '5', 'Bloklashdan oldingi urinishlar soni'],
    ])

add('RAW_DATA',
    ['ImportID', 'RowIndex', 'Payload'],
    [
        ['IMP-20260627-01', 1,
         '{"ariza":"AR-2026-0001","kadastr":"10:01:05:001"}'],
    ])

add('DATA',
    ['ArizaRaqami', 'Tranzaksiya', 'KadastrRaqami', 'PNFL', 'Buyurtmachi',
     'Viloyat', 'Tuman', 'Filial', 'MuhandisID', 'Muhandis', 'ArizaTuri',
     'ObyektTuri', 'TurarNoturar', 'QabulSanasi', 'MuddatKun', 'TugashSanasi',
     'BajarilganSana', 'JarayonHolati', 'QolganKun', 'OtganKun', 'SLAFoiz',
     'SLARang', 'Summa', 'TolanganSumma', 'TolovHolati', 'Yil', 'Oy',
     'ImportID'],
    [
        ['AR-2026-0001', 'TRX-1001', '10:01:05:0001', '31501860010001',
         'Aliyev Vali', 'Toshkent shahri', 'Chilonzor', 'Chilonzor filiali',
         'E-301', 'Aliyev Bobur', 'Yangi kadastr ishi', 'Bino', 'Turar',
         D(2026, 6, 15), 15, D(2026, 7, 6), '', 'JARAYONDA', 6, 0, 73,
         '#2e7d32', 500000, 0, 'TOLOV_KUTILMOQDA', 2026, 6, 'IMP-20260627-01'],
        ['AR-2026-0002', 'TRX-1002', '10:01:06:0017', '32602750020002',
         'Qodirova Nigora', 'Toshkent shahri', 'Yunusobod', 'Yunusobod filiali',
         'E-302', 'Yusupova Dilnoza', "O'zgartirish kiritish", 'Xonadon',
         'Turar', D(2026, 6, 18), 7, D(2026, 6, 29), '', 'BUGUN_TUGAYDI', 0, 0,
         0, '#c62828', 250000, 250000, 'TOLANGAN', 2026, 6, 'IMP-20260627-01'],
        ['AR-2026-0003', 'TRX-1003', '10:01:05:0042', '31988900030003',
         'Mirzayev Sardor', 'Toshkent shahri', 'Chilonzor', 'Chilonzor filiali',
         'E-301', 'Aliyev Bobur', "Ko'chmas mulkni ro'yxatga olish", 'Ombor',
         'Noturar', D(2026, 6, 1), 10, D(2026, 6, 15), '', 'MUDDATI_OTGAN', 0,
         8, -45, '#000000', 350000, 0, 'TOLOV_KUTILMOQDA', 2026, 6,
         'IMP-20260627-01'],
        ['AR-2026-0004', 'TRX-1004', '18:09:01:0003', '51702800040004',
         'Toirov Akbar', 'Samarqand', 'Samarqand shahri', 'Samarqand filiali',
         'E-303', 'Saidov Jasur', 'Texnik pasport tayyorlash', 'Bino', 'Turar',
         D(2026, 6, 22), 5, D(2026, 6, 29), D(2026, 6, 26), 'BAJARILGAN', 2, 0,
         85, '#2e7d32', 150000, 150000, 'TOLANGAN', 2026, 6, 'IMP-20260627-01'],
        ['AR-2026-0005', 'TRX-1005', '18:09:02:0021', '52803910050005',
         'Berdiyeva Zilola', 'Samarqand', 'Samarqand shahri', 'Samarqand filiali',
         'E-303', 'Saidov Jasur', 'Yer uchastkasi rasmiylashtiruvi', 'Yer',
         'Noturar', D(2026, 6, 10), 20, D(2026, 7, 8), '', 'JARAYONDA', 7, 0,
         35, '#ef6c00', 750000, 300000, 'TOLOV_KUTILMOQDA', 2026, 6,
         'IMP-20260627-01'],
        ['AR-2026-0006', 'TRX-1006', '10:01:06:0099', '33704820060006',
         'Soliyev Davron', 'Toshkent shahri', 'Yunusobod', 'Yunusobod filiali',
         'E-302', 'Yusupova Dilnoza', 'Yangi kadastr ishi', 'Bino', 'Turar',
         D(2026, 6, 8), 15, D(2026, 6, 29), '', 'JARAYONDA', 1, 0, 18,
         '#ef6c00', 500000, 500000, 'TOLANGAN', 2026, 6, 'IMP-20260627-01'],
    ])

add('STATISTICS',
    ['Metric', 'Dimension', 'DimensionValue', 'Value', 'ComputedAt'],
    [
        ['TOTAL_APPLICATIONS', 'ALL', '', 1245, NOW],
        ['DONE', 'ALL', '', 890, NOW],
        ['IN_PROGRESS', 'ALL', '', 300, NOW],
        ['OVERDUE', 'ALL', '', 55, NOW],
        ['BY_REGION', 'Region', 'Toshkent shahri', 640, NOW],
        ['BY_REGION', 'Region', 'Samarqand', 410, NOW],
    ])

add('MONTHLY_STATS',
    ['Year', 'Month', 'Dimension', 'DimensionValue', 'Total', 'Done', 'Overdue',
     'Revenue'],
    [
        [2026, 5, 'Region', 'Toshkent shahri', 380, 360, 12, 142000000],
        [2026, 6, 'Region', 'Toshkent shahri', 420, 300, 20, 151000000],
        [2026, 6, 'Region', 'Samarqand', 260, 190, 15, 88000000],
    ])

add('FINANCE',
    ['Year', 'Month', 'Dimension', 'DimensionValue', 'Billed', 'Paid',
     'Pending'],
    [
        [2026, 6, 'Region', 'Toshkent shahri', 210000000, 150000000, 60000000],
        [2026, 6, 'District', 'Chilonzor', 95000000, 70000000, 25000000],
        [2026, 6, 'District', 'Yunusobod', 78000000, 60000000, 18000000],
    ])

add('EXPORT_QUEUE',
    ['JobID', 'Username', 'Format', 'Filters', 'Status', 'FileURL', 'Error',
     'CreatedAt', 'FinishedAt'],
    [
        ['JOB-0001', 'admin', 'XLSX', '{"region":"Toshkent shahri","year":2026}',
         'DONE', 'https://drive.google.com/file/d/EXAMPLE/view', '',
         DT(2026, 6, 27, 9, 0, 0), DT(2026, 6, 27, 9, 1, 30)],
    ])

add('LOGIN_LOG',
    ['Timestamp', 'Username', 'Success', 'IP', 'UserAgent', 'Message'],
    [
        [DT(2026, 6, 27, 8, 45, 0), 'admin', True, '192.168.1.10',
         'Mozilla/5.0', 'OK'],
        [DT(2026, 6, 27, 8, 50, 12), 'engineer', False, '192.168.1.22',
         'Mozilla/5.0', "Noto'g'ri parol"],
    ])

add('ACTION_LOG',
    ['Timestamp', 'Type', 'Username', 'Action', 'Details'],
    [
        [DT(2026, 6, 27, 9, 5, 0), 'IMPORT', 'admin', 'IMPORT_COMPLETED',
         '{"importId":"IMP-20260627-01","rows":6}'],
        [DT(2026, 6, 27, 9, 10, 0), 'ACTION', 'region', 'VIEW_DASHBOARD', '{}'],
    ])

add('IMPORT_LOG',
    ['ImportID', 'Username', 'FileName', 'Status', 'RowCount', 'BackupID',
     'StartedAt', 'FinishedAt', 'Message'],
    [
        ['IMP-20260627-01', 'admin', 'kunlik_hisobot_2026-06-27.xlsx',
         'COMPLETED', 6, 'BK-20260627-01', DT(2026, 6, 27, 9, 4, 0),
         DT(2026, 6, 27, 9, 5, 0), 'Muvaffaqiyatli import qilindi'],
    ])

add('BACKUP',
    ['BackupID', 'ImportID', 'SheetName', 'RowCount', 'Snapshot', 'CreatedAt'],
    [
        ['BK-20260627-01', 'IMP-20260627-01', 'DATA', 0, '[]',
         DT(2026, 6, 27, 9, 4, 0)],
    ])


# ---------------------------------------------------------------------------
# OOXML writers
# ---------------------------------------------------------------------------
def cell_xml(ref, value):
    """Render a single <c> element based on the python value type."""
    if isinstance(value, bool):
        return '<c r="%s" t="b"><v>%d</v></c>' % (ref, 1 if value else 0)
    if isinstance(value, datetime.datetime):
        return '<c r="%s" s="%d"><v>%s</v></c>' % (ref, S_DATETIME, serial(value))
    if isinstance(value, datetime.date):
        return '<c r="%s" s="%d"><v>%s</v></c>' % (ref, S_DATE, serial(value))
    if isinstance(value, (int, float)):
        return '<c r="%s"><v>%s</v></c>' % (ref, value)
    if value == '' or value is None:
        return '<c r="%s"/>' % ref
    esc = html.escape(str(value), quote=True)
    return '<c r="%s" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>' % (ref, esc)


def sheet_xml(headers, rows, selected):
    n_cols = len(headers)
    n_rows = len(rows) + 1
    dim = 'A1:%s%d' % (col_letter(n_cols), n_rows)
    tab_sel = ' tabSelected="1"' if selected else ''
    parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        '<dimension ref="%s"/>' % dim,
        '<sheetViews><sheetView%s workbookViewId="0">' % tab_sel,
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
        '</sheetView></sheetViews>',
        '<sheetFormatPr defaultRowHeight="15"/>',
        '<cols><col min="1" max="%d" width="20" customWidth="1"/></cols>' % n_cols,
        '<sheetData>',
    ]
    # Header row
    hdr_cells = ''.join(
        cell_xml('%s1' % col_letter(c + 1), headers[c]).replace(
            't="inlineStr"', 's="%d" t="inlineStr"' % S_HEADER)
        for c in range(n_cols))
    parts.append('<row r="1">%s</row>' % hdr_cells)
    # Data rows
    for ri, row in enumerate(rows, start=2):
        cells = ''.join(
            cell_xml('%s%d' % (col_letter(ci + 1), ri), row[ci])
            for ci in range(n_cols))
        parts.append('<row r="%d">%s</row>' % (ri, cells))
    parts.append('</sheetData></worksheet>')
    return ''.join(parts)


STYLES_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<numFmts count="2">'
    '<numFmt numFmtId="164" formatCode="dd.mm.yyyy"/>'
    '<numFmt numFmtId="165" formatCode="dd.mm.yyyy\\ hh:mm"/>'
    '</numFmts>'
    '<fonts count="2">'
    '<font><sz val="11"/><name val="Calibri"/></font>'
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
    '</fonts>'
    '<fills count="3">'
    '<fill><patternFill patternType="none"/></fill>'
    '<fill><patternFill patternType="gray125"/></fill>'
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/>'
    '<bgColor indexed="64"/></patternFill></fill>'
    '</fills>'
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    '<cellXfs count="4">'
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    '</cellXfs>'
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    '</styleSheet>'
)


def build(path):
    n = len(SHEETS)
    content_types = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ]
    for i in range(1, n + 1):
        content_types.append(
            '<Override PartName="/xl/worksheets/sheet%d.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' % i)
    content_types.append('</Types>')

    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/></Relationships>')

    sheets_xml = ''.join(
        '<sheet name="%s" sheetId="%d" r:id="rId%d"/>' % (html.escape(SHEETS[i][0]), i + 1, i + 1)
        for i in range(n))
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets>%s</sheets></workbook>' % sheets_xml)

    wb_rels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
               '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
    for i in range(1, n + 1):
        wb_rels.append(
            '<Relationship Id="rId%d" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            'Target="worksheets/sheet%d.xml"/>' % (i, i))
    wb_rels.append(
        '<Relationship Id="rId%d" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>' % (n + 1))
    wb_rels.append('</Relationships>')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', ''.join(content_types))
        z.writestr('_rels/.rels', root_rels)
        z.writestr('xl/workbook.xml', workbook)
        z.writestr('xl/_rels/workbook.xml.rels', ''.join(wb_rels))
        z.writestr('xl/styles.xml', STYLES_XML)
        for i, (name, headers, rows) in enumerate(SHEETS, start=1):
            z.writestr('xl/worksheets/sheet%d.xml' % i,
                       sheet_xml(headers, rows, selected=(i == 1)))
    print('Wrote %s (%d sheets)' % (path, n))


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, '..', 'samples', 'DKP_Namuna.xlsx')
    build(os.path.normpath(out))
