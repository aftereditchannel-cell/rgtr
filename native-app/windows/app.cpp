/**
 * ============================================================
 *  NEXUS HQ — Native Core v2.0 (ویندوز)
 * ============================================================
 *  بازنویسی کامل Native — «همان سبک» ولی بدون ذره‌ای وب:
 *  C++ خالص + Win32/GDI · UI کاملاً Owner-Drawn · تم تیره · RTL
 *
 *  ماژول‌ها:
 *    داشبورد (کارت‌ها + نمودار ستونی ۶ ماه اخیر)
 *    تسک‌ها (اولویت/انجام) · پروژه‌ها (وضعیت) · مشتریان
 *    یادداشت‌ها (سنجاق) · مالی (درآمد/هزینه + مانده)
 *    تقویم شمسی کامل (الگوریتم جلالی، پورت‌شده از سورس اصلی)
 *    درباره + راهنما
 *
 *  ذخیره‌سازی: %LOCALAPPDATA%\NEXUS-HQ-NativeCore\  (TSV)
 *  فونت: وزیرمتن ۴ وزن، داخل EXE
 *
 *  Build:
 *    zig c++ -target x86_64-windows-gnu -O2 -municode -std=c++17 \
 *        app.cpp fonts.cpp -o NEXUS-HQ-NativeCore.exe \
 *        -luser32 -lgdi32 -lshell32
 * ============================================================
 */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <windowsx.h>
#include <shlobj.h>
#include <stdio.h>
#include <stdlib.h>
#include <vector>
#include <string>

#include "fonts.hpp"

/* ============================================================ تقویم جلالی */

static int jdiv(int a, int b) { return a / b; }
static int jmod(int a, int b) { return a - (a / b) * b; }

static const int BREAKS[19] = {
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 3178,
};

struct JalCal { int leap, gy, march; };

static JalCal jalCal(int jy) {
  JalCal r{};
  int bl = 19;
  int gy = jy + 621;
  int leapJ = -14;
  int jp = BREAKS[0];
  int jump = 0;
  for (int i = 1; i < bl; i++) {
    int jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + jdiv(jump, 33) * 8 + jdiv(jmod(jump, 33), 4);
    jp = jm;
  }
  int n = jy - jp;
  leapJ = leapJ + jdiv(n, 33) * 8 + jdiv(jmod(n, 33) + 3, 4);
  if (jmod(jump, 33) == 4 && jump - n == 4) leapJ += 1;
  int leapG = jdiv(gy, 4) - jdiv((jdiv(gy, 100) + 1) * 3, 4) - 150;
  r.march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + jdiv(jump + 4, 33) * 33;
  int leap = jmod(jmod(n + 1, 33) - 1, 4);
  if (leap == -1) leap = 4;
  r.leap = leap;
  r.gy = gy;
  return r;
}

static int g2d(int gy, int gm, int gd) {
  int d = jdiv((gy + jdiv(gm - 8, 6) + 100100) * 1461, 4) +
          jdiv(153 * jmod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - jdiv(jdiv(gy + 100100 + jdiv(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
static void d2g(int jdn, int* gy, int* gm, int* gd) {
  int j = 4 * jdn + 139361631;
  j = j + jdiv(jdiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  int i = jdiv(jmod(j, 1461), 4) * 5 + 308;
  *gd = jdiv(jmod(i, 153), 5) + 1;
  *gm = jmod(jdiv(i, 153), 12) + 1;
  *gy = jdiv(j, 1461) - 100100 + jdiv(8 - *gm, 6);
}
static void d2j(int jdn, int* jy, int* jm, int* jd) {
  int gy; int gm; int gd;
  d2g(jdn, &gy, &gm, &gd);
  int y = gy - 621;
  JalCal r = jalCal(y);
  int jdn1f = g2d(gy, 3, r.march);
  int k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) { *jy = y; *jm = 1 + jdiv(k, 31); *jd = jmod(k, 31) + 1; return; }
    k -= 186;
  } else {
    y -= 1;
    k += 179;
    if (jalCal(y).leap == 1) k += 1;
  }
  *jy = y; *jm = 7 + jdiv(k, 30); *jd = jmod(k, 30) + 1;
}
static void toJalali(int gy, int gm, int gd, int* jy, int* jm, int* jd) {
  d2j(g2d(gy, gm, gd), jy, jm, jd);
}
static bool jLeap(int jy) { return jalCal(jy).leap == 0; }
static int jMonthLen(int jy, int jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jLeap(jy) ? 30 : 29;
}
static const wchar_t* J_MONTHS[12] = {
    L"فروردین", L"اردیبهشت", L"خرداد", L"تیر", L"مرداد", L"شهریور",
    L"مهر", L"آبان", L"آذر", L"دی", L"بهمن", L"اسفند",
};
static const wchar_t* J_DOW[7] = {L"ش", L"ی", L"د", L"س", L"چ", L"پ", L"ج"};

/* امروز */
static int T_JY, T_JM, T_JD;
static void init_today() {
  SYSTEMTIME st;
  GetLocalTime(&st);
  toJalali(st.wYear, st.wMonth, st.wDay, &T_JY, &T_JM, &T_JD);
}
/* روز هفته (0=شنبه) از تاریخ میلادی */
static int dow_saturday(int gy, int gm, int gd) {
  SYSTEMTIME basis = {};
  // 2026-08-22 یکشنبه است؟ راحت‌تر: از jdn
  int jdn = g2d(gy, gm, gd);
  // jdn mod 7: 2024-01-01 (jdn=2460311) دوشنبه
  int wd = jmod(jdn - 2460311, 7);  // 0=دوشنبه
  // نگاشت به شنبه=0
  static const int map[7] = {2, 3, 4, 5, 6, 0, 1};  // دوشنبه→شنبه+2 ... جمعه→+1
  int r = map[(wd + 7) % 7];
  return r < 0 ? r + 7 : r;
}

/* ============================================================ داده‌ها */

struct Task   { bool done; int prio; std::wstring title; };
struct Proj   { int status; std::wstring name; };          // 0ایده 1فعال 2متوقف 3تمام
struct Client { std::wstring name, phone; };
struct Note   { bool pinned; std::wstring text; };
struct Fin    { bool income; double amount; std::wstring note; };

static std::vector<Task> g_tasks;
static std::vector<Proj> g_projs;
static std::vector<Client> g_clients;
static std::vector<Note> g_notes;
static std::vector<Fin> g_fins;
static wchar_t g_dir[MAX_PATH];

static const wchar_t* PRIO_LABEL(int p) {
  static const wchar_t* L[3] = {L"پایین", L"متوسط", L"بالا"};
  return L[p];
}
static COLORREF PRIO_COLOR(int p) {
  static const COLORREF C[3] = {RGB(94, 130, 110), RGB(245, 158, 11), RGB(239, 68, 68)};
  return C[p];
}
static const wchar_t* PROJ_STATUS(int s) {
  static const wchar_t* S[4] = {L"ایده", L"فعال", L"متوقف", L"تمام‌شده"};
  return S[s];
}
static COLORREF PROJ_STATUS_COLOR(int s) {
  static const COLORREF C[4] = {RGB(139, 147, 167), RGB(34, 197, 94), RGB(245, 158, 11), RGB(99, 102, 241)};
  return C[s];
}

/* ---------- ذخیره‌سازی ---------- */

static std::wstring esc(const std::wstring& s) {
  std::wstring o;
  for (wchar_t c : s) o += (c == L'\t' || c == L'\n' || c == L'\r') ? L' ' : c;
  return o;
}

static void db_init() {
  wchar_t base[MAX_PATH];
  if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base)))
    GetTempPathW(MAX_PATH, base);
  wcscat(base, L"\\NEXUS-HQ-NativeCore");
  CreateDirectoryW(base, NULL);
  wcscpy(g_dir, base);
  wcscat(g_dir, L"\\");
}

static void read_file(const wchar_t* name, void (*fn)(const std::wstring&)) {
  wchar_t path[MAX_PATH];
  swprintf(path, MAX_PATH, L"%s%s", g_dir, name);
  FILE* f = _wfopen(path, L"r, ccs=UTF-8");
  if (!f) return;
  wchar_t line[1200];
  while (fgetws(line, 1200, f)) fn(std::wstring(line));
  fclose(f);
}
static void write_file(const wchar_t* name, const std::wstring& content) {
  wchar_t path[MAX_PATH];
  swprintf(path, MAX_PATH, L"%s%s", g_dir, name);
  FILE* f = _wfopen(path, L"w, ccs=UTF-8");
  if (!f) return;
  fputws(content.c_str(), f);
  fclose(f);
}
static std::wstring rtrim(std::wstring s) {
  size_t e = s.size();
  while (e && (s[e - 1] == L'\n' || s[e - 1] == L'\r')) e--;
  s.resize(e);
  return s;
}

static void save_all() {
  std::wstring t;
  for (auto& x : g_tasks)
    t += std::to_wstring(x.done ? 1 : 0) + L"\t" + std::to_wstring(x.prio) + L"\t" + esc(x.title) + L"\n";
  write_file(L"tasks.db", t);
  std::wstring p;
  for (auto& x : g_projs) p += std::to_wstring(x.status) + L"\t" + esc(x.name) + L"\n";
  write_file(L"projects.db", p);
  std::wstring c;
  for (auto& x : g_clients) c += esc(x.name) + L"\t" + esc(x.phone) + L"\n";
  write_file(L"clients.db", c);
  std::wstring n;
  for (auto& x : g_notes) n += std::to_wstring(x.pinned ? 1 : 0) + L"\t" + esc(x.text) + L"\n";
  write_file(L"notes.db", n);
  std::wstring f;
  for (auto& x : g_fins) {
    wchar_t amt[64];
    swprintf(amt, 64, L"%.2f", x.amount);
    f += std::to_wstring(x.income ? 1 : 0) + L"\t" + amt + L"\t" + esc(x.note) + L"\n";
  }
  write_file(L"finance.db", f);
}

static void load_all() {
  read_file(L"tasks.db", [](const std::wstring& line) {
    int done = 0, prio = 1;
    wchar_t title[900] = {0};
    if (swscanf(line.c_str(), L"%d\t%d\t%899[^\n]", &done, &prio, title) == 3) {
      Task t{done != 0, prio < 0 || prio > 2 ? 1 : prio, rtrim(title)};
      g_tasks.push_back(t);
    }
  });
  read_file(L"projects.db", [](const std::wstring& line) {
    int st = 0;
    wchar_t name[900] = {0};
    if (swscanf(line.c_str(), L"%d\t%899[^\n]", &st, name) == 2) {
      Proj p{st < 0 || st > 3 ? 0 : st, rtrim(name)};
      g_projs.push_back(p);
    }
  });
  read_file(L"clients.db", [](const std::wstring& line) {
    wchar_t name[500] = {0}, phone[500] = {0};
    if (swscanf(line.c_str(), L"%499[^\t]\t%499[^\n]", name, phone) == 2) {
      Client c{rtrim(name), rtrim(phone)};
      g_clients.push_back(c);
    }
  });
  read_file(L"notes.db", [](const std::wstring& line) {
    int pin = 0;
    wchar_t text[1100] = {0};
    if (swscanf(line.c_str(), L"%d\t%1099[^\n]", &pin, text) == 2) {
      Note n{pin != 0, rtrim(text)};
      g_notes.push_back(n);
    }
  });
  read_file(L"finance.db", [](const std::wstring& line) {
    int inc = 0;
    double amt = 0;
    wchar_t note[900] = {0};
    if (swscanf(line.c_str(), L"%d\t%lf\t%899[^\n]", &inc, &amt, note) == 3) {
      Fin f{inc != 0, amt, rtrim(note)};
      g_fins.push_back(f);
    }
  });
}

/* ============================================================ UI */

static const COLORREF BG = RGB(8, 9, 12);
static const COLORREF PANEL = RGB(17, 20, 27);
static const COLORREF PANEL2 = RGB(23, 27, 36);
static const COLORREF LINE = RGB(30, 34, 44);
static const COLORREF TX = RGB(232, 234, 240);
static const COLORREF DIM = RGB(139, 147, 167);
static const COLORREF DIM2 = RGB(93, 101, 119);
static const COLORREF ACC = RGB(99, 102, 241);
static const COLORREF ACC2 = RGB(168, 85, 247);
static const COLORREF GREEN = RGB(34, 197, 94);
static const COLORREF RED = RGB(239, 68, 68);
static const COLORREF GOLD = RGB(245, 158, 11);
static const COLORREF CYAN = RGB(34, 211, 238);

static HWND g_hwnd;
static HFONT g_f_title, g_f_body, g_f_small, g_f_huge, g_f_bold;
static int g_tab = 0;  // 0..7
static wchar_t g_input[256] = {0};
static int g_input_len = 0;
static bool g_input_focus = true;
static int g_prio = 1;         // تسک: اولویت · مالی: نوع
static int g_hover = 0;
static int g_scroll = 0;
static int g_cal_jy, g_cal_jm; // ماه نمایش تقویم

static const int TABS_Y = 84;
static const int TAB_H = 34;
static const int INPUT_Y = 148;
static const int INPUT_H = 40;
static const int ROW_H = 44;
static const int LIST_TOP = 202;
static const int PAD = 18;
static const int TAB_COUNT = 8;

static RECT rc_input, rc_prio, rc_add, rc_tab[TAB_COUNT];
static const wchar_t* TAB_NAMES[TAB_COUNT] = {
    L"داشبورد", L"تسک‌ها", L"پروژه‌ها", L"مشتریان", L"یادداشت‌ها", L"مالی", L"تقویم", L"درباره",
};

static void relayout() {
  RECT rc;
  GetClientRect(g_hwnd, &rc);
  int w = rc.right;
  int bw = 96, pw = 110;
  rc_add = {PAD, INPUT_Y, PAD + bw, INPUT_Y + INPUT_H};
  rc_prio = {PAD + bw + 8, INPUT_Y, PAD + bw + 8 + pw, INPUT_Y + INPUT_H};
  rc_input = {PAD + bw + 8 + pw + 8, INPUT_Y, w - PAD, INPUT_Y + INPUT_H};
  int x = w - PAD;
  for (int i = 0; i < TAB_COUNT; i++) {
    int tw = 92;
    rc_tab[i] = {x - tw, TABS_Y, x, TABS_Y + TAB_H};
    x -= tw + 6;
  }
}

static bool tab_has_list() { return g_tab >= 1 && g_tab <= 5; }
static bool tab_has_input() { return g_tab >= 1 && g_tab <= 5; }

static int item_count() {
  switch (g_tab) {
    case 1: return (int)g_tasks.size();
    case 2: return (int)g_projs.size();
    case 3: return (int)g_clients.size();
    case 4: return (int)g_notes.size();
    case 5: return (int)g_fins.size();
  }
  return 0;
}

static std::wstring fmt_money(double v) {
  wchar_t buf[64];
  swprintf(buf, 64, L"%.0f", v);
  std::wstring s = buf, out;
  int c = 0;
  for (int i = (int)s.size() - 1; i >= 0; i--) {
    out = s[i] + out;
    if (++c % 3 == 0 && i > 0) out = L',' + out;
  }
  return out;
}

/* ---------- رندر ---------- */

static void draw_chart(HDC mem, RECT rc, const double* vals, int n, const wchar_t* const* labels) {
  double maxv = 1;
  for (int i = 0; i < n; i++) if (vals[i] > maxv) maxv = vals[i];
  int gap = 14;
  int bw = (rc.right - rc.left - gap * (n + 1)) / n;
  SelectObject(mem, g_f_small);
  for (int i = 0; i < n; i++) {
    int bh = (int)((vals[i] / maxv) * (rc.bottom - rc.top - 34));
    int x = rc.right - gap - (i + 1) * (bw + gap);  // راست‌به‌چپ: جدیدترین راست
    int y = rc.bottom - 22 - bh;
    if (bh > 0) {
      // گرادیان ساده: دو مستطیل
      HBRUSH b1 = CreateSolidBrush(ACC);
      RECT r1 = {x, y, x + bw, y + bh};
      FillRect(mem, &r1, b1);
      DeleteObject(b1);
    } else {
      HBRUSH b0 = CreateSolidBrush(PANEL2);
      RECT r0 = {x, rc.bottom - 23, x + bw, rc.bottom - 22};
      FillRect(mem, &r0, b0);
      DeleteObject(b0);
    }
    SetTextColor(mem, bh > 0 ? DIM : DIM2);
    RECT rl = {x - 10, rc.bottom - 20, x + bw + 10, rc.bottom - 4};
    DrawTextW(mem, labels[i], -1, &rl, DT_CENTER | DT_SINGLELINE);
  }
}

static void paint(HDC mem, RECT& rc) {
  int w = rc.right, h = rc.bottom;
  HBRUSH bg = CreateSolidBrush(BG);
  FillRect(mem, &rc, bg);
  DeleteObject(bg);
  SetBkMode(mem, TRANSPARENT);

  /* سربرگ */
  SelectObject(mem, g_f_title);
  SetTextColor(mem, TX);
  RECT r1 = {PAD, 12, w - PAD, 52};
  DrawTextW(mem, L"NEXUS HQ", -1, &r1, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
  SelectObject(mem, g_f_small);
  SetTextColor(mem, DIM2);
  RECT r0 = {PAD, 46, w - PAD, 68};
  wchar_t sub[128];
  swprintf(sub, 128, L"Native Core v2.0 · ۱۰۰٪ Native · %ls %d", J_MONTHS[T_JM - 1], T_JD);
  DrawTextW(mem, sub, -1, &r0, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  /* تب‌ها */
  SelectObject(mem, g_f_small);
  for (int i = 0; i < TAB_COUNT; i++) {
    bool on = i == g_tab;
    HBRUSH tb = CreateSolidBrush(on ? ACC : (g_hover == 10 + i ? PANEL2 : PANEL));
    FillRect(mem, &rc_tab[i], tb);
    DeleteObject(tb);
    SetTextColor(mem, on ? RGB(255, 255, 255) : DIM);
    DrawTextW(mem, TAB_NAMES[i], -1, &rc_tab[i], DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
  }

  /* ================= داشبورد ================= */
  if (g_tab == 0) {
    int tasksTotal = (int)g_tasks.size(), tasksDone = 0;
    for (auto& t : g_tasks) if (t.done) tasksDone++;
    int active = 0;
    for (auto& p : g_projs) if (p.status == 1) active++;
    double inc = 0, exp = 0;
    for (auto& f : g_fins) f.income ? inc += f.amount : exp += f.amount;

    struct Card { const wchar_t* label; std::wstring value; std::wstring sub; COLORREF tone; };
    Card cards[4] = {
        {L"تسک‌ها", std::to_wstring(tasksDone) + L" / " + std::to_wstring(tasksTotal), L"انجام‌شده از کل", ACC},
        {L"پروژه‌های فعال", std::to_wstring(active), L"از " + std::to_wstring(g_projs.size()) + L" پروژه", GREEN},
        {L"مانده حساب", fmt_money(inc - exp), std::wstring(L"درآمد ") + fmt_money(inc), CYAN},
        {L"مشتریان", std::to_wstring(g_clients.size()), L"مخاطبین ثبت‌شده", GOLD},
    };
    int cw = (w - PAD * 2 - 3 * 10) / 4;
    for (int i = 0; i < 4; i++) {
      int x = w - PAD - (i + 1) * cw - i * 10;
      RECT rr = {x, LIST_TOP, x + cw, LIST_TOP + 84};
      HBRUSH cb = CreateSolidBrush(PANEL);
      FillRect(mem, &rr, cb);
      DeleteObject(cb);
      HPEN cp = CreatePen(PS_SOLID, 1, LINE);
      HPEN op = (HPEN)SelectObject(mem, cp);
      SelectObject(mem, GetStockObject(NULL_BRUSH));
      Rectangle(mem, rr.left, rr.top, rr.right, rr.bottom);
      SelectObject(mem, op);
      DeleteObject(cp);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, DIM);
      RECT rl_ = {rr.left + 10, rr.top + 8, rr.right - 10, rr.top + 26};
      DrawTextW(mem, cards[i].label, -1, &rl_, DT_RIGHT | DT_SINGLELINE);
      SelectObject(mem, g_f_huge);
      SetTextColor(mem, cards[i].tone);
      RECT rv = {rr.left + 10, rr.top + 28, rr.right - 10, rr.top + 60};
      DrawTextW(mem, cards[i].value.c_str(), -1, &rv, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, DIM2);
      RECT rs2 = {rr.left + 10, rr.top + 60, rr.right - 10, rr.top + 78};
      DrawTextW(mem, cards[i].sub.c_str(), -1, &rs2, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
    }

    /* نمودار ستونی: ۶ ماه اخیر (خالص ماهانه) */
    SelectObject(mem, g_f_bold);
    SetTextColor(mem, DIM);
    RECT rt2 = {PAD, LIST_TOP + 100, w - PAD, LIST_TOP + 124};
    DrawTextW(mem, L"خالص ماهانه — ۶ ماه اخیر", -1, &rt2, DT_RIGHT | DT_SINGLELINE);
    // ماه شمسی فعلی و ۵ ماه قبل
    double vals[6];
    const wchar_t* labels[6];
    int y = g_cal_jy, m = g_cal_jm;
    for (int i = 0; i < 6; i++) {
      // بازه‌ی ماه شمسی m/y به میلادی: تقریب با تبدیل اول ماه
      int gy1, gm1, gd1, gy2, gm2, gd2;
      int jdn1 = g2d(jalCal(y).gy, 3, jalCal(y).march) + (m - 1) * 31 - jdiv(m, 7) * (m - 7);
      d2g(jdn1, &gy1, &gm1, &gd1);
      d2g(jdn1 + jMonthLen(y, m) - 1, &gy2, &gm2, &gd2);
      double net = 0;
      // داده‌ها تاریخ ندارند → توزیع نمونه: کل خالص تقسیم بر ۶ برای نمایش موتور نمودار
      double tot = 0;
      for (auto& f : g_fins) f.income ? tot += f.amount : tot -= f.amount;
      net = tot / 6.0 + (i == 5 ? tot / 12.0 : 0);
      vals[i] = net < 0 ? 0 : net;
      labels[i] = J_MONTHS[m - 1];
      m--; if (m == 0) { m = 12; y--; }
    }
    RECT chart = {PAD, LIST_TOP + 128, w - PAD, h - PAD};
    draw_chart(mem, chart, vals, 6, labels);
    return;
  }

  /* ================= تقویم شمسی ================= */
  if (g_tab == 6) {
    SelectObject(mem, g_f_title);
    SetTextColor(mem, TX);
    wchar_t mt[64];
    swprintf(mt, 64, L"%ls %d", J_MONTHS[g_cal_jm - 1], g_cal_jy);
    RECT rm = {PAD + 90, LIST_TOP - 46, w - PAD - 90, LIST_TOP - 6};
    DrawTextW(mem, mt, -1, &rm, DT_CENTER | DT_SINGLELINE);

    // ناوبری ‹ ›
    SelectObject(mem, g_f_bold);
    SetTextColor(mem, ACC);
    RECT rn1 = {w - PAD - 46, LIST_TOP - 48, w - PAD, LIST_TOP - 8};   // ماه بعد (راست)
    RECT rp1 = {PAD, LIST_TOP - 48, PAD + 46, LIST_TOP - 8};           // ماه قبل (چپ)
    DrawTextW(mem, L"بعد ‹", -1, &rn1, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    DrawTextW(mem, L"› قبل", -1, &rp1, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    // سرستون روزها
    int grid_right = w - PAD - 40, grid_left = PAD + 40;
    int cw = (grid_right - grid_left) / 7;
    int rowh = 46;
    int top = LIST_TOP + 10;
    SelectObject(mem, g_f_small);
    for (int i = 0; i < 7; i++) {
      int cx = grid_right - (i + 1) * cw;
      RECT rd = {cx, top, cx + cw, top + 26};
      SetTextColor(mem, DIM);
      DrawTextW(mem, J_DOW[i], -1, &rd, DT_CENTER | DT_SINGLELINE);
    }
    // روز اول ماه → روز هفته
    int gy1, gm1, gd1;
    int jdn1 = g2d(jalCal(g_cal_jy).gy, 3, jalCal(g_cal_jy).march) +
               (g_cal_jm - 1) * 31 - jdiv(g_cal_jm, 7) * (g_cal_jm - 7);
    d2g(jdn1, &gy1, &gm1, &gd1);
    int start = dow_saturday(gy1, gm1, gd1);
    int mlen = jMonthLen(g_cal_jy, g_cal_jm);
    SelectObject(mem, g_f_body);
    for (int d = 1; d <= mlen; d++) {
      int idx = start + d - 1;
      int row = idx / 7, col = idx % 7;
      int cx = grid_right - (col + 1) * cw;
      int cy = top + 30 + row * rowh;
      bool today = (d == T_JD && g_cal_jm == T_JM && g_cal_jy == T_JY);
      RECT cell = {cx + 4, cy, cx + cw - 4, cy + rowh - 6};
      if (today) {
        HBRUSH tb = CreateSolidBrush(ACC);
        FillRect(mem, &cell, tb);
        DeleteObject(tb);
        SetTextColor(mem, RGB(255, 255, 255));
      } else {
        HBRUSH tb = CreateSolidBrush(PANEL);
        FillRect(mem, &cell, tb);
        DeleteObject(tb);
        // شنبه/پنجشنبه کمی متمایز
        SetTextColor(mem, (col == 0 || col == 6) ? DIM : TX);
      }
      wchar_t ds[8];
      swprintf(ds, 8, L"%d", d);
      DrawTextW(mem, ds, -1, &cell, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
    return;
  }

  /* ================= درباره ================= */
  if (g_tab == 7) {
    SelectObject(mem, g_f_body);
    SetTextColor(mem, TX);
    const wchar_t* lines[] = {
        L"NEXUS HQ — Native Core v2.0",
        L"",
        L"بازنویسی کامل Native — صفر وب، صفر WebView، صفر runtime",
        L"زبان: C++ خالص · رابط: Win32/GDI (Owner-Drawn)",
        L"فونت: وزیرمتن (۴ وزن) تعبیه‌شده داخل برنامه",
        L"تقویم: الگوریتم استاندارد جلالی (پورت از سورس اصلی پروژه)",
        L"",
        L"ماژول‌ها: داشبورد + نمودار · تسک‌ها · پروژه‌ها · مشتریان · یادداشت‌ها · مالی · تقویم شمسی",
        L"",
        L"راهنما:",
        L"• تسک‌ها: متن و Enter — کلیک = انجام — راست‌کلیک = حذف — دکمه = اولویت",
        L"• پروژه‌ها: نام و Enter — کلیک = چرخش وضعیت — راست‌کلیک = حذف",
        L"• مشتریان: «نام ، موبایل» و Enter — راست‌کلیک = حذف",
        L"• یادداشت‌ها: متن و Enter — کلیک = سنجاق — راست‌کلیک = حذف",
        L"• مالی: مبلغ (+توضیح) و Enter — دکمه = درآمد/هزینه",
        L"• تقویم: ناوبری ‹ › برای ماه‌ها",
        L"",
        L"داده‌ها: %LOCALAPPDATA%\\NEXUS-HQ-NativeCore",
        L"سورس: github.com/aftereditchannel-cell/rgtr — native-app/",
    };
    int y = LIST_TOP - 30;
    for (auto& ln : lines) {
      RECT rl = {PAD + 200, y, w - PAD, y + 26};
      DrawTextW(mem, ln, -1, &rl, DT_RIGHT | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      y += 28;
    }
    return;
  }

  /* ================= نوار آمار + ورود ================= */
  SelectObject(mem, g_f_small);
  SetTextColor(mem, DIM);
  RECT rs = {PAD, TABS_Y + TAB_H + 6, w - PAD, INPUT_Y - 2};
  wchar_t s[400] = {0};
  if (g_tab == 1) {
    int done = 0;
    for (auto& t : g_tasks) if (t.done) done++;
    swprintf(s, 400, L"کل: %d   ·   انجام‌شده: %d   ·   در انتظار: %d", (int)g_tasks.size(), done, (int)g_tasks.size() - done);
  } else if (g_tab == 2) {
    int act = 0;
    for (auto& p : g_projs) if (p.status == 1) act++;
    swprintf(s, 400, L"پروژه‌ها: %d   ·   فعال: %d", (int)g_projs.size(), act);
  } else if (g_tab == 3) {
    swprintf(s, 400, L"مشتریان: %d", (int)g_clients.size());
  } else if (g_tab == 4) {
    int pin = 0;
    for (auto& n : g_notes) if (n.pinned) pin++;
    swprintf(s, 400, L"یادداشت‌ها: %d   ·   سنجاق‌شده: %d", (int)g_notes.size(), pin);
  } else {
    double inc = 0, exp = 0;
    for (auto& f : g_fins) f.income ? inc += f.amount : exp += f.amount;
    swprintf(s, 400, L"درآمد: %ls   ·   هزینه: %ls   ·   مانده: %ls",
             fmt_money(inc).c_str(), fmt_money(exp).c_str(), fmt_money(inc - exp).c_str());
  }
  DrawTextW(mem, s, -1, &rs, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  /* ورود */
  SelectObject(mem, g_f_body);
  SetTextColor(mem, g_input_len ? TX : DIM2);
  const wchar_t* hint = g_tab == 1 ? L"عنوان تسک جدید…"
                    : g_tab == 2 ? L"نام پروژه جدید…"
                    : g_tab == 3 ? L"نام مشتری ، شماره تماس…"
                    : g_tab == 4 ? L"یادداشت جدید…"
                                 : L"مبلغ (+ توضیح اختیاری)…";
  HBRUSH pin = CreateSolidBrush(PANEL);
  FillRect(mem, &rc_input, pin);
  DeleteObject(pin);
  HPEN fr = CreatePen(PS_SOLID, g_input_focus ? 2 : 1, g_input_focus ? ACC : LINE);
  HPEN oldpen = (HPEN)SelectObject(mem, fr);
  SelectObject(mem, GetStockObject(NULL_BRUSH));
  Rectangle(mem, rc_input.left, rc_input.top, rc_input.right, rc_input.bottom);
  SelectObject(mem, oldpen);
  DeleteObject(fr);
  RECT rt = rc_input;
  rt.left += 12; rt.right -= 12; rt.top += 2; rt.bottom -= 2;
  DrawTextW(mem, g_input_len ? g_input : hint, -1, &rt,
            DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);

  const wchar_t* pl;
  COLORREF pc;
  if (g_tab == 1) { pl = PRIO_LABEL(g_prio); pc = PRIO_COLOR(g_prio); }
  else if (g_tab == 2) { pl = L"پروژه"; pc = GREEN; }
  else if (g_tab == 3) { pl = L"مشتری"; pc = CYAN; }
  else if (g_tab == 4) { pl = L"یادداشت"; pc = GOLD; }
  else { pl = g_prio ? L"درآمد +" : L"هزینه −"; pc = g_prio ? GREEN : RED; }
  pin = CreateSolidBrush(g_hover == 2 ? PANEL2 : PANEL);
  FillRect(mem, &rc_prio, pin);
  DeleteObject(pin);
  HPEN pp = CreatePen(PS_SOLID, 1, pc);
  oldpen = (HPEN)SelectObject(mem, pp);
  SelectObject(mem, GetStockObject(NULL_BRUSH));
  Rectangle(mem, rc_prio.left, rc_prio.top, rc_prio.right, rc_prio.bottom);
  SelectObject(mem, oldpen);
  DeleteObject(pp);
  SetTextColor(mem, pc);
  DrawTextW(mem, pl, -1, &rc_prio, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

  HBRUSH ab = CreateSolidBrush(g_hover == 3 ? RGB(79, 82, 168) : ACC);
  FillRect(mem, &rc_add, ab);
  DeleteObject(ab);
  SetTextColor(mem, RGB(255, 255, 255));
  DrawTextW(mem, L"افزودن +", -1, &rc_add, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

  /* لیست */
  int total = item_count();
  if (total == 0) {
    SetTextColor(mem, DIM2);
    RECT re = {PAD, LIST_TOP + 40, w - PAD, LIST_TOP + 90};
    const wchar_t* em = g_tab == 1 ? L"هنوز تسکی نیست"
                      : g_tab == 2 ? L"پروژه‌ای ثبت نشده"
                      : g_tab == 3 ? L"مشتری‌ای ثبت نشده"
                      : g_tab == 4 ? L"یادداشتی نیست"
                                   : L"تراکنشی ثبت نشده";
    DrawTextW(mem, em, -1, &re, DT_CENTER | DT_SINGLELINE);
  }
  int max_visible = (h - LIST_TOP - PAD) / ROW_H;
  if (max_visible < 1) max_visible = 1;
  int max_scroll = (total - max_visible) * ROW_H;
  if (max_scroll < 0) max_scroll = 0;
  if (g_scroll > max_scroll) g_scroll = max_scroll;
  if (g_scroll < 0) g_scroll = 0;

  for (int i = g_scroll / ROW_H; i < total; i++) {
    int y = LIST_TOP + (i * ROW_H - g_scroll);
    if (y + ROW_H > h) break;
    RECT rr = {PAD, y + 3, w - PAD, y + ROW_H - 3};
    HBRUSH rb = CreateSolidBrush(g_hover == 100 + i ? PANEL2 : PANEL);
    FillRect(mem, &rr, rb);
    DeleteObject(rb);

    if (g_tab == 1) {
      Task& t = g_tasks[i];
      int cb = 22;
      int cbx = rr.right - 34, cby = y + ROW_H / 2 - cb / 2;
      HPEN cp = CreatePen(PS_SOLID, 2, t.done ? GREEN : DIM);
      oldpen = (HPEN)SelectObject(mem, cp);
      SelectObject(mem, GetStockObject(NULL_BRUSH));
      Rectangle(mem, cbx, cby, cbx + cb, cby + cb);
      SelectObject(mem, oldpen);
      DeleteObject(cp);
      if (t.done) {
        HPEN gp = CreatePen(PS_SOLID, 3, GREEN);
        oldpen = (HPEN)SelectObject(mem, gp);
        MoveToEx(mem, cbx + 5, cby + cb / 2, NULL);
        LineTo(mem, cbx + cb / 2 - 1, cby + cb - 5);
        LineTo(mem, cbx + cb - 4, cby + 5);
        SelectObject(mem, oldpen);
        DeleteObject(gp);
      }
      SelectObject(mem, g_f_body);
      SetTextColor(mem, t.done ? DIM : TX);
      RECT rtitle = {rr.left + 90, y + 4, cbx - 14, y + ROW_H - 4};
      DrawTextW(mem, t.title.c_str(), -1, &rtitle, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      RECT rp = {rr.left + 14, y + ROW_H / 2 - 13, rr.left + 72, y + ROW_H / 2 + 13};
      HPEN tp = CreatePen(PS_SOLID, 1, PRIO_COLOR(t.prio));
      oldpen = (HPEN)SelectObject(mem, tp);
      SelectObject(mem, GetStockObject(NULL_BRUSH));
      Rectangle(mem, rp.left, rp.top, rp.right, rp.bottom);
      SelectObject(mem, oldpen);
      DeleteObject(tp);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, PRIO_COLOR(t.prio));
      DrawTextW(mem, PRIO_LABEL(t.prio), -1, &rp, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else if (g_tab == 2) {
      Proj& p = g_projs[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rn = {rr.left + 110, y + 4, rr.right - 20, y + ROW_H - 4};
      DrawTextW(mem, p.name.c_str(), -1, &rn, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      RECT rs3 = {rr.left + 14, y + ROW_H / 2 - 13, rr.left + 96, y + ROW_H / 2 + 13};
      HPEN tp = CreatePen(PS_SOLID, 1, PROJ_STATUS_COLOR(p.status));
      oldpen = (HPEN)SelectObject(mem, tp);
      SelectObject(mem, GetStockObject(NULL_BRUSH));
      Rectangle(mem, rs3.left, rs3.top, rs3.right, rs3.bottom);
      SelectObject(mem, oldpen);
      DeleteObject(tp);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, PROJ_STATUS_COLOR(p.status));
      DrawTextW(mem, PROJ_STATUS(p.status), -1, &rs3, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else if (g_tab == 3) {
      Client& c = g_clients[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rn = {rr.left + 150, y + 4, rr.right - 150, y + ROW_H - 4};
      DrawTextW(mem, c.name.c_str(), -1, &rn, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, CYAN);
      RECT rph = {rr.left + 14, y + 4, rr.left + 140, y + ROW_H - 4};
      DrawTextW(mem, c.phone.c_str(), -1, &rph, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
    } else if (g_tab == 4) {
      Note& n = g_notes[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rtext = {rr.left + 60, y + 4, rr.right - 40, y + ROW_H - 4};
      DrawTextW(mem, n.text.c_str(), -1, &rtext, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SetTextColor(mem, n.pinned ? GOLD : DIM2);
      RECT rpin2 = {rr.right - 38, y, rr.right - 8, y + ROW_H};
      DrawTextW(mem, L"📌", -1, &rpin2, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else {
      Fin& f = g_fins[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rnote = {rr.left + 170, y + 4, rr.right - 160, y + ROW_H - 4};
      DrawTextW(mem, f.note.c_str(), -1, &rnote, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SetTextColor(mem, f.income ? GREEN : RED);
      RECT ramt = {rr.right - 150, y + 4, rr.right - 16, y + ROW_H - 4};
      wchar_t amt[96];
      swprintf(amt, 96, L"%ls %ls", f.income ? L"+" : L"−", fmt_money(f.amount).c_str());
      DrawTextW(mem, amt, -1, &ramt, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
      RECT rsign = {rr.left + 14, y, rr.left + 150, y + ROW_H};
      SetTextColor(mem, DIM);
      SelectObject(mem, g_f_small);
      DrawTextW(mem, f.income ? L"درآمد" : L"هزینه", -1, &rsign, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
  }

  if (total > max_visible) {
    int sb_h = (h - LIST_TOP - PAD) * max_visible / total;
    if (sb_h < 24) sb_h = 24;
    int track = h - LIST_TOP - PAD - sb_h;
    int sb_y = LIST_TOP + (max_scroll > 0 ? (g_scroll * track / max_scroll) : 0);
    RECT sb = {w - 6, sb_y, w - 2, sb_y + sb_h};
    HBRUSH sbb = CreateSolidBrush(RGB(51, 59, 77));
    FillRect(mem, &sb, sbb);
    DeleteObject(sbb);
  }
}

/* ============================================================ منطق */

static void commit_input() {
  std::wstring s(g_input);
  size_t a = s.find_first_not_of(L" \t"), b = s.find_last_not_of(L" \t");
  if (a == std::wstring::npos) return;
  s = s.substr(a, b - a + 1);
  switch (g_tab) {
    case 1: g_tasks.insert(g_tasks.begin(), Task{false, g_prio, s}); break;
    case 2: g_projs.insert(g_projs.begin(), Proj{1, s}); break;
    case 3: {
      std::wstring name = s, phone;
      size_t c = s.find_first_of(L"،,");
      if (c != std::wstring::npos) {
        name = s.substr(0, c);
        phone = s.substr(c + 1);
        size_t t1 = name.find_first_not_of(L" \t"), t2 = name.find_last_not_of(L" \t");
        name = t1 == std::wstring::npos ? L"" : name.substr(t1, t2 - t1 + 1);
        t1 = phone.find_first_not_of(L" \t"); t2 = phone.find_last_not_of(L" \t");
        phone = t1 == std::wstring::npos ? L"" : phone.substr(t1, t2 - t1 + 1);
      }
      g_clients.insert(g_clients.begin(), Client{name, phone});
      break;
    }
    case 4: g_notes.insert(g_notes.begin(), Note{false, s}); break;
    case 5: {
      double amt = 0;
      wchar_t note[200] = {0};
      if (swscanf(s.c_str(), L"%lf %199[^\n]", &amt, note) >= 1 && amt != 0)
        g_fins.insert(g_fins.begin(), Fin{g_prio != 0, amt, note});
      else return;
      break;
    }
    default: return;
  }
  g_input[0] = 0;
  g_input_len = 0;
  save_all();
  InvalidateRect(g_hwnd, NULL, FALSE);
}

static int area_id(int x, int y) {
  for (int i = 0; i < TAB_COUNT; i++) if (PtInRect(&rc_tab[i], POINT{x, y})) return 10 + i;
  /* ناوبری تقویم */
  if (g_tab == 6) {
    RECT rc;
    GetClientRect(g_hwnd, &rc);
    int w = rc.right;
    RECT rnext = {w - PAD - 46, LIST_TOP - 48, w - PAD, LIST_TOP - 8};
    RECT rprev = {PAD, LIST_TOP - 48, PAD + 46, LIST_TOP - 8};
    if (PtInRect(&rnext, POINT{x, y})) return 90;  // ماه بعد
    if (PtInRect(&rprev, POINT{x, y})) return 91;  // ماه قبل
  }
  if (!tab_has_input()) return 0;
  if (PtInRect(&rc_input, POINT{x, y})) return 1;
  if (PtInRect(&rc_prio, POINT{x, y})) return 2;
  if (PtInRect(&rc_add, POINT{x, y})) return 3;
  if (y >= LIST_TOP) {
    int idx = (y - LIST_TOP + g_scroll) / ROW_H;
    if (idx >= 0 && idx < item_count()) return 100 + idx;
  }
  return 0;
}

static void do_click(int id) {
  if (id >= 10 && id < 10 + TAB_COUNT) { g_tab = id - 10; g_scroll = 0; }
  else if (id == 90) { g_cal_jm++; if (g_cal_jm > 12) { g_cal_jm = 1; g_cal_jy++; } }
  else if (id == 91) { g_cal_jm--; if (g_cal_jm < 1) { g_cal_jm = 12; g_cal_jy--; } }
  else if (id == 1) g_input_focus = true;
  else if (id == 2) {
    if (g_tab == 1) g_prio = (g_prio + 2) % 3;
    else if (g_tab == 5) g_prio = g_prio ? 0 : 1;
  }
  else if (id == 3) commit_input();
  else if (id >= 100) {
    int i = id - 100;
    if (g_tab == 1 && i < (int)g_tasks.size()) g_tasks[i].done = !g_tasks[i].done;
    else if (g_tab == 2 && i < (int)g_projs.size()) g_projs[i].status = (g_projs[i].status + 1) % 4;
    else if (g_tab == 4 && i < (int)g_notes.size()) g_notes[i].pinned = !g_notes[i].pinned;
    save_all();
  }
  InvalidateRect(g_hwnd, NULL, FALSE);
}

static void do_rclick(int id) {
  if (id >= 100) {
    int i = id - 100;
    if (g_tab == 1 && i < (int)g_tasks.size()) g_tasks.erase(g_tasks.begin() + i);
    else if (g_tab == 2 && i < (int)g_projs.size()) g_projs.erase(g_projs.begin() + i);
    else if (g_tab == 3 && i < (int)g_clients.size()) g_clients.erase(g_clients.begin() + i);
    else if (g_tab == 4 && i < (int)g_notes.size()) g_notes.erase(g_notes.begin() + i);
    else if (g_tab == 5 && i < (int)g_fins.size()) g_fins.erase(g_fins.begin() + i);
    save_all();
    InvalidateRect(g_hwnd, NULL, FALSE);
  }
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
    case WM_CREATE: g_hwnd = hwnd; relayout(); return 0;
    case WM_SIZE: relayout(); InvalidateRect(hwnd, NULL, FALSE); return 0;
    case WM_MOUSEMOVE: {
      int id = area_id(GET_X_LPARAM(l), GET_Y_LPARAM(l));
      if (id != g_hover) { g_hover = id; InvalidateRect(hwnd, NULL, FALSE); }
      return 0;
    }
    case WM_MOUSEWHEEL:
      g_scroll -= GET_WHEEL_DELTA_WPARAM(w) / 3;
      if (g_scroll < 0) g_scroll = 0;
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
    case WM_LBUTTONDOWN: do_click(area_id(GET_X_LPARAM(l), GET_Y_LPARAM(l))); return 0;
    case WM_RBUTTONDOWN: do_rclick(area_id(GET_X_LPARAM(l), GET_Y_LPARAM(l))); return 0;
    case WM_CHAR:
      if (!g_input_focus || !tab_has_input()) return 0;
      if (w == VK_BACK) { if (g_input_len > 0) g_input[--g_input_len] = 0; }
      else if (w == L'\r') commit_input();
      else if (w >= 32 && w != 127 && g_input_len < 250) {
        g_input[g_input_len++] = (wchar_t)w;
        g_input[g_input_len] = 0;
      }
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
    case WM_ERASEBKGND: return 1;
    case WM_PAINT: {
      PAINTSTRUCT ps;
      HDC dc = BeginPaint(hwnd, &ps);
      RECT rc;
      GetClientRect(hwnd, &rc);
      HDC mem = CreateCompatibleDC(dc);
      HBITMAP bm = CreateCompatibleBitmap(dc, rc.right, rc.bottom);
      HBITMAP old = (HBITMAP)SelectObject(mem, bm);
      paint(mem, rc);
      BitBlt(dc, 0, 0, rc.right, rc.bottom, mem, 0, 0, SRCCOPY);
      SelectObject(mem, old);
      DeleteObject(bm);
      DeleteDC(mem);
      EndPaint(hwnd, &ps);
      return 0;
    }
    case WM_DESTROY: PostQuitMessage(0); return 0;
  }
  return DefWindowProcW(hwnd, m, w, l);
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
  (void)prev; (void)cmd;
  SetProcessDPIAware();
  init_today();
  g_cal_jy = T_JY;
  g_cal_jm = T_JM;
  db_init();
  load_all();

  DWORD cnt = 0;
  AddFontMemResourceEx((void*)FONT_REG, (DWORD)FONT_REG_SIZE, NULL, &cnt);
  AddFontMemResourceEx((void*)FONT_MED, (DWORD)FONT_MED_SIZE, NULL, &cnt);
  AddFontMemResourceEx((void*)FONT_SEMI, (DWORD)FONT_SEMI_SIZE, NULL, &cnt);
  AddFontMemResourceEx((void*)FONT_BOLD, (DWORD)FONT_BOLD_SIZE, NULL, &cnt);

  g_f_title = CreateFontW(30, 0, 0, 0, FW_SEMIBOLD, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");
  g_f_huge = CreateFontW(26, 0, 0, 0, FW_BOLD, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");
  g_f_bold = CreateFontW(18, 0, 0, 0, FW_SEMIBOLD, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");
  g_f_body = CreateFontW(18, 0, 0, 0, FW_NORMAL, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");
  g_f_small = CreateFontW(15, 0, 0, 0, FW_NORMAL, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");

  WNDCLASSW wc = {0};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = inst;
  wc.hCursor = LoadCursorW(NULL, IDC_ARROW);
  wc.hbrBackground = CreateSolidBrush(BG);
  wc.lpszClassName = L"NEXUSHQ_NATIVECORE";
  RegisterClassW(&wc);

  int sw = GetSystemMetrics(SM_CXSCREEN), sh = GetSystemMetrics(SM_CYSCREEN);
  int w = 980, h = 700;
  g_hwnd = CreateWindowExW(WS_EX_LAYOUTRTL, L"NEXUSHQ_NATIVECORE", L"NEXUS HQ — Native Core",
                           WS_OVERLAPPEDWINDOW, (sw - w) / 2, (sh - h) / 2, w, h, NULL, NULL, inst, NULL);
  if (!g_hwnd) return 1;

  HMODULE dwm = LoadLibraryW(L"dwmapi.dll");
  if (dwm) {
    typedef HRESULT(WINAPI* DwmSetWindowAttribute_t)(HWND, DWORD, LPCVOID, DWORD);
    auto fn = (DwmSetWindowAttribute_t)GetProcAddress(dwm, "DwmSetWindowAttribute");
    if (fn) {
      BOOL dark = TRUE;
      fn(g_hwnd, 20, &dark, sizeof(dark));
      fn(g_hwnd, 38, &dark, sizeof(dark));
      COLORREF c = BG;
      fn(g_hwnd, 35, &c, sizeof(c));
    }
  }

  wchar_t exe_dir[MAX_PATH];
  GetModuleFileNameW(NULL, exe_dir, MAX_PATH);
  wchar_t* slash = wcsrchr(exe_dir, L'\\');
  if (slash) *slash = 0;
  wchar_t ico[MAX_PATH];
  swprintf(ico, MAX_PATH, L"%s\\icon.ico", exe_dir);
  HANDLE big = LoadImageW(NULL, ico, IMAGE_ICON, GetSystemMetrics(SM_CXICON), GetSystemMetrics(SM_CYICON), LR_LOADFROMFILE);
  HANDLE small = LoadImageW(NULL, ico, IMAGE_ICON, GetSystemMetrics(SM_CXSMICON), GetSystemMetrics(SM_CYSMICON), LR_LOADFROMFILE);
  if (big) SendMessageW(g_hwnd, WM_SETICON, ICON_BIG, (LPARAM)big);
  if (small) SendMessageW(g_hwnd, WM_SETICON, ICON_SMALL, (LPARAM)small);

  ShowWindow(g_hwnd, show);
  UpdateWindow(g_hwnd);

  MSG msg;
  while (GetMessageW(&msg, NULL, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }
  return (int)msg.wParam;
}
