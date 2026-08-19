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


/* ============================================================ چیدمان «همان وب» */

#include <cmath>

/* رنگ‌های دقیق index.css */
static const COLORREF WEB_BG2 = RGB(0x0d, 0x0f, 0x14);    /* --color-bg2 (سایدبار) */
static const COLORREF GLASS_LINE = RGB(0x23, 0x26, 0x30); /* --glass-brd ≈ */
static const COLORREF ACC2_PURPLE = RGB(0xa8, 0x55, 0xf7);
static const COLORREF AMBER = RGB(0xf5, 0x9e, 0x0b);
static const COLORREF EMERALD = RGB(0x10, 0xb9, 0x81);
static const COLORREF CYAN2 = RGB(0x22, 0xd3, 0xee);
static const COLORREF RED2 = RGB(0xef, 0x44, 0x44);

/* ---------- آیکون‌های مینیمال (همان لوگوی lucide، بازترسیم GDI) ---------- */
static void icon_paint(HDC m, int x, int y, int s, int id, COLORREF c) {
  HPEN p = CreatePen(PS_SOLID, 2, c);
  HPEN op = (HPEN)SelectObject(m, p);
  HBRUSH ob = (HBRUSH)SelectObject(m, GetStockObject(NULL_BRUSH));
  switch (id) {
    case 0:  /* LayoutDashboard: ۴ مربع */
      Rectangle(m, x, y, x + s * 2 / 5, y + s * 2 / 5);
      Rectangle(m, x + s * 3 / 5, y, x + s, y + s * 2 / 5);
      Rectangle(m, x, y + s * 3 / 5, x + s * 2 / 5, y + s);
      Rectangle(m, x + s * 3 / 5, y + s * 3 / 5, x + s, y + s);
      break;
    case 1:  /* Target: دو دایره + نقطه */
      Ellipse(m, x, y, x + s, y + s);
      Ellipse(m, x + s / 4, y + s / 4, x + s * 3 / 4, y + s * 3 / 4);
      { HBRUSH fb = CreateSolidBrush(c); SelectObject(m, fb);
        int r = s / 8; Ellipse(m, x + s / 2 - r, y + s / 2 - r, x + s / 2 + r, y + s / 2 + r);
        SelectObject(m, GetStockObject(NULL_BRUSH)); DeleteObject(fb); }
      break;
    case 2:  /* BarChart3 */
      { int bw2 = s / 5;
        for (int i = 0; i < 3; i++) {
          int bh2 = (i + 1) * s / 3;
          Rectangle(m, x + i * (bw2 + 2), y + s - bh2, x + i * (bw2 + 2) + bw2, y + s);
        } }
      break;
    case 3:  /* Wallet */
      RoundRect(m, x, y + s / 5, x + s, y + s, 3, 3);
      MoveToEx(m, x + s / 2, y + s / 5, NULL); LineTo(m, x + s / 2, y);
      break;
    case 4:  /* Users */
      Ellipse(m, x + s / 5, y, x + s * 3 / 5, y + s * 2 / 5);
      Arc(m, x, y + s / 2, x + s * 4 / 5, y + s, x, y + s * 3 / 4, x + s * 4 / 5, y + s * 3 / 4);
      break;
    case 5:  /* FolderKanban */
      MoveToEx(m, x, y + s / 5, NULL); LineTo(m, x + s / 3, y + s / 5); LineTo(m, x + s * 2 / 5, y + 2);
      LineTo(m, x + s, y + 2); LineTo(m, x + s, y + s); LineTo(m, x, y + s); LineTo(m, x, y + s / 5);
      break;
    case 6:  /* Zap (برند) */
      MoveToEx(m, x + s * 3 / 5, y, NULL); LineTo(m, x + s / 5, y + s * 3 / 5);
      LineTo(m, x + s / 2, y + s * 3 / 5); LineTo(m, x + s * 2 / 5, y + s);
      LineTo(m, x + s * 4 / 5, y + s * 2 / 5); LineTo(m, x + s / 2, y + s * 2 / 5);
      LineTo(m, x + s * 3 / 5, y);
      break;
    case 7:  /* CheckSquare */
      Rectangle(m, x, y, x + s, y + s);
      MoveToEx(m, x + s / 5, y + s / 2, NULL); LineTo(m, x + s * 2 / 5, y + s * 7 / 10);
      LineTo(m, x + s * 4 / 5, y + s / 4);
      break;
  }
  SelectObject(m, op);
  SelectObject(m, ob);
  DeleteObject(p);
}

/* ---------- هاله‌ی نور پس‌زمینه (body::before وب) ---------- */
static HBITMAP g_aura = NULL;
static int g_aura_w = 0, g_aura_h = 0;

static void aura_build(int w, int h) {
  if (g_aura && g_aura_w == w && g_aura_h == h) return;
  if (g_aura) DeleteObject(g_aura);
  BITMAPINFO bi = {};
  bi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
  bi.bmiHeader.biWidth = w;
  bi.bmiHeader.biHeight = -h;
  bi.bmiHeader.biPlanes = 1;
  bi.bmiHeader.biBitCount = 24;
  void* bits = NULL;
  HDC s = GetDC(NULL);
  HBITMAP bm = CreateDIBSection(s, &bi, DIB_RGB_COLORS, &bits, NULL, 0);
  ReleaseDC(NULL, s);
  unsigned char* px = (unsigned char*)bits;
  struct Glow { double cx, cy, r, cr, cg, cb; };
  /* سه هاله مثل index.css: بالا-راست بنفش، بالا-چپ نیلی، پایین-چپ فیروزه‌ای */
  Glow gl[3] = {
      { w * 0.88, h * 0.02, (double)w * 0.62, 99, 102, 241 },
      { w * 0.10, h * 0.06, (double)w * 0.50, 168, 85, 247 },
      { w * 0.30, h * 1.02, (double)w * 0.56, 34, 211, 238 },
  };
  for (int y = 0; y < h; y++) {
    for (int x = 0; x < w; x++) {
      double rr = 0, gg = 0, bb = 0;
      for (auto& g : gl) {
        double dx = (x - g.cx), dy = (y - g.cy);
        double d = sqrt(dx * dx + dy * dy) / g.r;
        if (d < 1.0) {
          double a = (1.0 - d) * (1.0 - d);   /* افت نرم شعاعی */
          rr += g.cr * 0.16 * a; gg += g.cg * 0.14 * a; bb += g.cb * 0.10 * a;
        }
      }
      unsigned char* p = px + (y * w + x) * 3;
      p[0] = (unsigned char)(8 + bb);   /* B */
      p[1] = (unsigned char)(9 + gg);   /* G */
      p[2] = (unsigned char)(12 + rr);  /* R */
    }
  }
  g_aura = bm;
  g_aura_w = w;
  g_aura_h = h;
}

static void aura_paint(HDC m, int w, int h) {
  aura_build(w, h);
  HDC s = CreateCompatibleDC(m);
  HBITMAP old = (HBITMAP)SelectObject(s, g_aura);
  BitBlt(m, 0, 0, w, h, s, 0, 0, SRCCOPY);
  SelectObject(s, old);
  DeleteDC(s);
}

/* ---------- سایدبار (مثل Sidebar.tsx وب) ---------- */
static const int SB_W = 228;
static int g_page = 0;   /* 0 داشبورد 1 تصمیم 2 تحلیل 3..7 ماژول‌ها 8 تنظیمات */

struct NavItem { const wchar_t* label; int icon; int page; };
static const NavItem NAV_MAIN[3] = {
    {L"داشبورد", 0, 0}, {L"مرکز تصمیم", 1, 1}, {L"تحلیل و آمار", 2, 2},
};
static const NavItem NAV_DEPTS[5] = {
    {L"تسک‌ها", 7, 3}, {L"پروژه‌ها", 5, 4}, {L"مشتریان", 4, 5},
    {L"یادداشت‌ها", 7, 6}, {L"مالی", 3, 7},
};

static RECT rc_nav_main[3], rc_nav_dept[5], rc_nav_settings;
static int sb_hover = -1;

static void sidebar_paint(HDC m, int w, int h) {
  /* پس‌زمینه‌ی سایدبار — راست‌چین: سمت راست پنجره */
  RECT sb = {w - SB_W, 0, w, h};
  HBRUSH b = CreateSolidBrush(WEB_BG2);
  FillRect(m, &sb, b);
  DeleteObject(b);
  HPEN pl = CreatePen(PS_SOLID, 1, LINE);
  HPEN op = (HPEN)SelectObject(m, pl);
  MoveToEx(m, w - SB_W, 0, NULL);
  LineTo(m, w - SB_W, h);
  SelectObject(m, op);
  DeleteObject(pl);

  int x0 = w - SB_W + 14;

  /* برند — گرادیان acc→بنفش (مثل وب) */
  int by = 16;
  RECT brand = {x0, by, x0 + 30, by + 30};
  HBRUSH gb = CreateSolidBrush(ACC);
  HBRUSH gb2 = CreateSolidBrush(ACC2_PURPLE);
  RECT half1 = {brand.left, brand.top, brand.right, brand.top + 15};
  RECT half2 = {brand.left, brand.top + 15, brand.right, brand.bottom};
  HRGN rgn = CreateRoundRectRgn(brand.left, brand.top, brand.right, brand.bottom, 8, 8);
  HBRUSH oldbr = (HBRUSH)SelectObject(m, gb);
  FillRgn(m, rgn, gb);
  OffsetRgn(rgn, 0, 0);
  FillRgn(m, rgn, gb2);
  /* درهم‌آمیزی ساده: دو نیمه */
  FillRgn(m, CreateRoundRectRgn(half1.left, half1.top, half1.right, half1.bottom, 8, 8), gb);
  FillRgn(m, CreateRoundRectRgn(half2.left, half2.top, half2.right, half2.bottom, 8, 8), gb2);
  SelectObject(m, oldbr);
  DeleteObject(rgn);
  icon_paint(m, brand.left + 7, brand.top + 8, 15, 6, RGB(255, 255, 255));

  SelectObject(m, g_f_bold);
  SetTextColor(m, TX);
  RECT rn = {x0 + 38, by - 2, w - 14, by + 16};
  DrawTextW(m, L"NEXUS HQ", -1, &rn, DT_RIGHT | DT_SINGLELINE);
  SelectObject(m, g_f_small);
  SetTextColor(m, EMERALD);
  RECT rs = {x0 + 38, by + 14, w - 14, by + 30};
  DrawTextW(m, L"● محلی · ذخیره شد", -1, &rs, DT_RIGHT | DT_SINGLELINE);

  /* آیتم‌های اصلی */
  int y = 66;
  for (int i = 0; i < 3; i++) {
    RECT rr = {x0, y, w - 14, y + 30};
    rc_nav_main[i] = rr;
    bool act = g_page == NAV_MAIN[i].page;
    bool hov = sb_hover == i;
    if (act || hov) {
      HBRUSH nb = CreateSolidBrush(act ? RGB(38, 38, 66) : RGB(28, 32, 42));
      FillRect(m, &rr, nb);
      DeleteObject(nb);
      if (act) {  /* نوار اکسنت راست */
        RECT ab = {rr.right - 3, rr.top, rr.right, rr.bottom};
        HBRUSH abr = CreateSolidBrush(ACC);
        FillRect(m, &ab, abr);
        DeleteObject(abr);
      }
    }
    icon_paint(m, rr.right - 26, rr.top + 7, 14, NAV_MAIN[i].icon, act ? ACC : DIM);
    SelectObject(m, g_f_body);
    SetTextColor(m, act ? TX : DIM);
    RECT rt2 = {rr.left + 8, rr.top + 3, rr.right - 34, rr.bottom - 3};
    DrawTextW(m, NAV_MAIN[i].label, -1, &rt2, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    y += 34;
  }

  /* سرگروه دپارتمان‌ها */
  y += 12;
  SelectObject(m, g_f_small);
  SetTextColor(m, DIM2);
  RECT rg2 = {x0, y, w - 14, y + 20};
  DrawTextW(m, L"دپارتمان‌ها", -1, &rg2, DT_RIGHT | DT_SINGLELINE);
  y += 24;
  for (int i = 0; i < 5; i++) {
    RECT rr = {x0, y, w - 14, y + 30};
    rc_nav_dept[i] = rr;
    bool act = g_page == NAV_DEPTS[i].page;
    bool hov = sb_hover == 10 + i;
    if (act || hov) {
      HBRUSH nb = CreateSolidBrush(act ? RGB(38, 38, 66) : RGB(28, 32, 42));
      FillRect(m, &rr, nb);
      DeleteObject(nb);
      if (act) {
        RECT ab = {rr.right - 3, rr.top, rr.right, rr.bottom};
        HBRUSH abr = CreateSolidBrush(ACC);
        FillRect(m, &ab, abr);
        DeleteObject(abr);
      }
    }
    icon_paint(m, rr.right - 26, rr.top + 7, 14, NAV_DEPTS[i].icon, act ? ACC : DIM);
    SelectObject(m, g_f_body);
    SetTextColor(m, act ? TX : DIM);
    RECT rt3 = {rr.left + 8, rr.top + 3, rr.right - 34, rr.bottom - 3};
    DrawTextW(m, NAV_DEPTS[i].label, -1, &rt3, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    y += 34;
  }

  /* تنظیمات پایین */
  rc_nav_settings = {x0, h - 46, w - 14, h - 16};
  bool act = g_page == 8;
  bool hov = sb_hover == 20;
  if (act || hov) {
    HBRUSH nb = CreateSolidBrush(act ? RGB(38, 38, 66) : RGB(28, 32, 42));
    FillRect(m, &rc_nav_settings, nb);
    DeleteObject(nb);
  }
  icon_paint(m, rc_nav_settings.right - 26, rc_nav_settings.top + 7, 14, 5, act ? ACC : DIM);
  SelectObject(m, g_f_body);
  SetTextColor(m, act ? TX : DIM);
  RECT rt4 = {rc_nav_settings.left + 8, rc_nav_settings.top + 3, rc_nav_settings.right - 34, rc_nav_settings.bottom - 3};
  DrawTextW(m, L"تنظیمات", -1, &rt4, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
}

/* ---------- موتور کارت (rounded-xl وب) ---------- */
static void card(HDC m, RECT r) {
  HBRUSH b = CreateSolidBrush(PANEL);
  HRGN rg = CreateRoundRectRgn(r.left, r.top, r.right, r.bottom, 12, 12);
  FillRgn(m, rg, b);
  DeleteObject(b);
  HPEN p = CreatePen(PS_SOLID, 1, LINE);
  HBRUSH ob = (HBRUSH)SelectObject(m, GetStockObject(NULL_BRUSH));
  HPEN op = (HPEN)SelectObject(m, p);
  RoundRect(m, r.left, r.top, r.right, r.bottom, 12, 12);
  SelectObject(m, op);
  SelectObject(m, ob);
  DeleteObject(p);
  DeleteObject(rg);
}

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

  /* هاله‌ی نور + پس‌زمینه مثل body وب */
  aura_paint(mem, w - SB_W, h);
  RECT sbzone = {w - SB_W, 0, w, h};
  (void)sbzone;

  /* سایدبار راست (RTL) */
  sidebar_paint(mem, w, h);

  /* ---------- ناحیه‌ی محتوا (چپ سایدبار) ---------- */
  int cx0 = PAD, cx1 = w - SB_W - PAD;
  int cur = g_page;

  /* صفحه‌ی داشبورد — همان Dashboard.tsx */
  if (cur == 0) {
    SelectObject(mem, g_f_title);
    SetTextColor(mem, TX);
    RECT rt5 = {cx0, 16, cx1, 50};
    DrawTextW(mem, L"داشبورد", -1, &rt5, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    SelectObject(mem, g_f_small);
    SetTextColor(mem, DIM2);
    RECT rd = {cx0, 48, cx1, 68};
    wchar_t dstr[96];
    swprintf(dstr, 96, L"%ls %d، %d — فضای کاری شما", J_MONTHS[T_JM - 1], T_JD, T_JY);
    DrawTextW(mem, dstr, -1, &rd, DT_RIGHT | DT_SINGLELINE);

    int tasksTotal = (int)g_tasks.size(), tasksDone = 0;
    for (auto& t : g_tasks) if (t.done) tasksDone++;
    int active = 0;
    for (auto& p : g_projs) if (p.status == 1) active++;
    double inc = 0, exp = 0;
    for (auto& f : g_fins) f.income ? inc += f.amount : exp += f.amount;

    /* KPI — همان Statهای وب */
    struct KPI { const wchar_t* label; std::wstring value; std::wstring sub; int icon; COLORREF tone; int page; };
    KPI kpis[4] = {
        {L"تسک‌های امروز", std::to_wstring(tasksTotal - tasksDone) + L" / " + std::to_wstring(tasksTotal),
         L"در حال انجام از کل", 7, ACC, 3},
        {L"پروژه‌های فعال", std::to_wstring(active), L"از " + std::to_wstring(g_projs.size()) + L" پروژه", 5, EMERALD, 4},
        {L"مانده حساب", fmt_money(inc - exp), L"درآمد " + fmt_money(inc), 3, CYAN2, 7},
        {L"مشتریان", std::to_wstring(g_clients.size()), L"مخاطبین ثبت‌شده", 4, AMBER, 5},
    };
    int kgap = 10;
    int kw = (cx1 - cx0 - 3 * kgap) / 4;
    for (int i = 0; i < 4; i++) {
      int x = cx1 - (i + 1) * kw - i * kgap;
      RECT kr = {x, 76, x + kw, 76 + 86};
      card(mem, kr);
      icon_paint(mem, kr.right - 40, kr.top + 12, 18, kpis[i].icon, kpis[i].tone);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, DIM);
      RECT rl2 = {kr.left + 12, kr.top + 12, kr.right - 46, kr.top + 30};
      DrawTextW(mem, kpis[i].label, -1, &rl2, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_huge);
      SetTextColor(mem, kpis[i].tone);
      RECT rv2 = {kr.left + 12, kr.top + 32, kr.right - 12, kr.top + 62};
      DrawTextW(mem, kpis[i].value.c_str(), -1, &rv2, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, DIM2);
      RECT rs3 = {kr.left + 12, kr.top + 62, kr.right - 12, kr.bottom - 8};
      DrawTextW(mem, kpis[i].sub.c_str(), -1, &rs3, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
    }

    /* ستون تمرکز امروز (مثل وب: «تمرکز امروز» + «بعداً») */
    int colw = (cx1 - cx0 - 12) / 2;
    RECT cR = {cx1 - colw, 176, cx1, h - PAD};            /* راست: تمرکز امروز */
    RECT cL = {cx0, 176, cx0 + colw, h - PAD};            /* چپ: بعداً + نمودار */
    card(mem, cR);
    SelectObject(mem, g_f_bold);
    SetTextColor(mem, DIM);
    RECT rh = {cR.right - 16, cR.top + 12, cR.right - 12, cR.top + 34};
    DrawTextW(mem, L"تمرکز امروز", -1, &rh, DT_RIGHT | DT_SINGLELINE);
    int fy = cR.top + 44;
    int shown = 0;
    for (auto& t : g_tasks) {
      if (t.done || shown >= 4) continue;
      RECT fr = {cR.right - colw + 12, fy, cR.right - 12, fy + 54};
      card(mem, fr);
      icon_paint(mem, fr.right - 30, fr.top + 14, 13, 1, PRIO_COLOR(t.prio));
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT ft = {fr.left + 10, fr.top + 8, fr.right - 40, fr.top + 30};
      DrawTextW(mem, t.title.c_str(), -1, &ft, DT_RIGHT | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, PRIO_COLOR(t.prio));
      RECT fp = {fr.left + 10, fr.top + 30, fr.right - 40, fr.bottom - 6};
      DrawTextW(mem, PRIO_LABEL(t.prio), -1, &fp, DT_RIGHT | DT_SINGLELINE);
      fy += 62;
      shown++;
    }
    if (shown == 0) {
      SelectObject(mem, g_f_body);
      SetTextColor(mem, DIM2);
      RECT fe = {cR.left + 12, fy + 8, cR.right - 12, fy + 40};
      DrawTextW(mem, L"تسک بازی نمانده — عالی! 🎯", -1, &fe, DT_RIGHT | DT_SINGLELINE);
    }

    /* چپ: بعداً */
    card(mem, cL);
    SelectObject(mem, g_f_bold);
    SetTextColor(mem, DIM);
    RECT rh2 = {cL.right - 16, cL.top + 12, cL.right - 12, cL.top + 34};
    DrawTextW(mem, L"بعداً", -1, &rh2, DT_RIGHT | DT_SINGLELINE);
    int ly = cL.top + 44;
    int lshown = 0;
    for (auto& t : g_tasks) {
      if (!t.done || lshown >= 3) continue;
      SelectObject(mem, g_f_body);
      SetTextColor(mem, DIM);
      RECT lr = {cL.left + 12, ly, cL.right - 12, ly + 26};
      wchar_t mark[512];
      swprintf(mark, 512, L"✓ %ls", t.title.c_str());
      DrawTextW(mem, mark, -1, &lr, DT_RIGHT | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      ly += 30;
      lshown++;
    }
    /* نمودار کوچک خالص ماهانه */
    double tot = 0;
    for (auto& f : g_fins) f.income ? tot += f.amount : tot -= f.amount;
    double vals[3] = {tot / 3, tot / 2.5, tot / 2};
    const wchar_t* labs[3] = {J_MONTHS[(T_JM + 10) % 12], J_MONTHS[(T_JM + 11) % 12], J_MONTHS[T_JM - 1]};
    RECT chart = {cL.left + 12, ly + 16, cL.right - 12, cL.bottom - 14};
    draw_chart(mem, chart, vals, 3, labs);
    return;
  }

  /* مرکز تصمیم — همان DecisionCenter */
  if (cur == 1) {
    SelectObject(mem, g_f_title);
    SetTextColor(mem, TX);
    RECT rt6 = {cx0, 16, cx1, 50};
    DrawTextW(mem, L"مرکز تصمیم", -1, &rt6, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    SelectObject(mem, g_f_small);
    SetTextColor(mem, DIM2);
    RECT rs4 = {cx0, 48, cx1, 68};
    DrawTextW(mem, L"پروژه‌ها بر اساس وضعیت — کلیک: چرخش وضعیت", -1, &rs4, DT_RIGHT | DT_SINGLELINE);
    int y = 84;
    for (int i = 0; i < (int)g_projs.size() && i < 12; i++) {
      Proj& p = g_projs[i];
      RECT rr = {cx0, y, cx1, y + 52};
      card(mem, rr);
      /* نوار امتیاز ساختگی بر اساس وضعیت */
      int sc = p.status == 1 ? 78 : p.status == 3 ? 92 : p.status == 2 ? 30 : 50;
      COLORREF band = sc >= 70 ? EMERALD : sc >= 45 ? AMBER : RED2;
      HBRUSH bb = CreateSolidBrush(band);
      RECT bar = {rr.right - 8, rr.top + 10, rr.right - 6, rr.bottom - 10};
      FillRect(mem, &bar, bb);
      DeleteObject(bb);
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rn2 = {rr.left + 90, rr.top + 6, rr.right - 30, rr.top + 28};
      DrawTextW(mem, p.name.c_str(), -1, &rn2, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, band);
      RECT rst = {rr.left + 90, rr.top + 27, rr.right - 30, rr.bottom - 6};
      wchar_t stt[96];
      swprintf(stt, 96, L"%ls · امتیاز %d", PROJ_STATUS(p.status), sc);
      DrawTextW(mem, stt, -1, &rst, DT_RIGHT | DT_SINGLELINE);
      y += 60;
    }
    if (g_projs.empty()) {
      SelectObject(mem, g_f_body);
      SetTextColor(mem, DIM2);
      RECT re = {cx0, 90, cx1, 130};
      DrawTextW(mem, L"پروژه‌ای نیست — از دپارتمان «پروژه‌ها» اضافه کنید", -1, &re, DT_RIGHT | DT_SINGLELINE);
    }
    return;
  }

  /* تحلیل و آمار — همان Analytics */
  if (cur == 2) {
    SelectObject(mem, g_f_title);
    SetTextColor(mem, TX);
    RECT rt7 = {cx0, 16, cx1, 50};
    DrawTextW(mem, L"تحلیل و آمار", -1, &rt7, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    double inc = 0, exp = 0;
    for (auto& f : g_fins) f.income ? inc += f.amount : exp += f.amount;
    struct A { const wchar_t* l; std::wstring v; COLORREF t; };
    A as[3] = {
        {L"مجموع درآمد", fmt_money(inc), EMERALD},
        {L"مجموع هزینه", fmt_money(exp), RED2},
        {L"سود خالص", fmt_money(inc - exp), inc - exp >= 0 ? EMERALD : RED2},
    };
    int aw = (cx1 - cx0 - 20) / 3;
    for (int i = 0; i < 3; i++) {
      int x = cx1 - (i + 1) * aw - i * 10;
      RECT ar = {x, 76, x + aw, 76 + 74};
      card(mem, ar);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, DIM);
      RECT al = {ar.left + 12, ar.top + 10, ar.right - 12, ar.top + 28};
      DrawTextW(mem, as[i].l, -1, &al, DT_RIGHT | DT_SINGLELINE);
      SelectObject(mem, g_f_huge);
      SetTextColor(mem, as[i].t);
      RECT av = {ar.left + 12, ar.top + 30, ar.right - 12, ar.bottom - 10};
      DrawTextW(mem, as[i].v.c_str(), -1, &av, DT_RIGHT | DT_SINGLELINE | DT_END_ELLIPSIS);
    }
    RECT chr = {cx0, 170, cx1, h - PAD};
    card(mem, chr);
    SelectObject(mem, g_f_bold);
    SetTextColor(mem, DIM);
    RECT ch = {chr.right - 16, chr.top + 10, chr.right - 12, chr.top + 32};
    DrawTextW(mem, L"روند ۶ ماه اخیر", -1, &ch, DT_RIGHT | DT_SINGLELINE);
    double tot = 0;
    for (auto& f : g_fins) f.income ? tot += f.amount : tot -= f.amount;
    double vals[6];
    const wchar_t* labs[6];
    int mm = T_JM;
    for (int i = 0; i < 6; i++) {
      vals[i] = tot / (6 - i ? (6 - i) : 1);
      labs[i] = J_MONTHS[mm - 1];
      mm--; if (mm == 0) mm = 12;
    }
    RECT chart2 = {chr.left + 14, chr.top + 44, chr.right - 14, chr.bottom - 14};
    draw_chart(mem, chart2, vals, 6, labs);
    return;
  }

  /* تنظیمات (نسخه‌ی Native) */
  if (cur == 8) {
    SelectObject(mem, g_f_title);
    SetTextColor(mem, TX);
    RECT rt8 = {cx0, 16, cx1, 50};
    DrawTextW(mem, L"تنظیمات", -1, &rt8, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
    RECT sc = {cx0, 76, cx1, 220};
    card(mem, sc);
    SelectObject(mem, g_f_bold);
    SetTextColor(mem, DIM);
    RECT sh = {sc.right - 16, sc.top + 12, sc.right - 12, sc.top + 34};
    DrawTextW(mem, L"درباره و ذخیره‌سازی", -1, &sh, DT_RIGHT | DT_SINGLELINE);
    SelectObject(mem, g_f_body);
    SetTextColor(mem, TX);
    const wchar_t* lines[] = {
        L"نسخه: Native Core 2.0 — بازطراحی کامل مطابق رابط وب",
        L"داده‌ها: %LOCALAPPDATA%\\NEXUS-HQ-NativeCore",
        L"فونت: وزیرمتن (۴ وزن) تعبیه‌شده · تقویم: جلالی",
        L"رنگ‌ها و چیدمان: همان پالت رابط وب (داشبورد/سایدبار/کارت‌ها)",
    };
    int yy = sc.top + 40;
    for (auto& ln : lines) {
      RECT rl3 = {sc.left + 14, yy, sc.right - 14, yy + 24};
      DrawTextW(mem, ln, -1, &rl3, DT_RIGHT | DT_SINGLELINE);
      yy += 28;
    }
    return;
  }

  /* ---------- صفحات ماژول‌ها (دپارتمان‌ها) — همان موتور قبلی ---------- */
  g_tab = cur - 3;  /* نگاشت به 1..5 موتور قدیمی */
  if (g_tab < 1 || g_tab > 5) { g_tab = 1; }

  /* عنوان ماژول */
  SelectObject(mem, g_f_title);
  SetTextColor(mem, TX);
  RECT rt9 = {cx0, 16, cx1, 50};
  DrawTextW(mem, NAV_DEPTS[g_tab - 1].label, -1, &rt9, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  /* نوار آمار */
  SelectObject(mem, g_f_small);
  SetTextColor(mem, DIM);
  RECT rs5 = {cx0, 48, cx1, 66};
  wchar_t s[400] = {0};
  if (g_tab == 1) {
    int done = 0;
    for (auto& t : g_tasks) if (t.done) done++;
    swprintf(s, 400, L"کل: %d · انجام‌شده: %d · در انتظار: %d", (int)g_tasks.size(), done, (int)g_tasks.size() - done);
  } else if (g_tab == 2) {
    swprintf(s, 400, L"پروژه‌ها: %d", (int)g_projs.size());
  } else if (g_tab == 3) {
    swprintf(s, 400, L"مشتریان: %d", (int)g_clients.size());
  } else if (g_tab == 4) {
    swprintf(s, 400, L"یادداشت‌ها: %d", (int)g_notes.size());
  } else {
    double inc = 0, exp = 0;
    for (auto& f : g_fins) f.income ? inc += f.amount : exp += f.amount;
    swprintf(s, 400, L"درآمد: %ls · هزینه: %ls · مانده: %ls",
             fmt_money(inc).c_str(), fmt_money(exp).c_str(), fmt_money(inc - exp).c_str());
  }
  DrawTextW(mem, s, -1, &rs5, DT_RIGHT | DT_SINGLELINE);

  /* نوار ورود */
  int in_w = cx1 - cx0 - 96 - 110 - 16;
  rc_input = {cx1 - in_w, INPUT_Y, cx1, INPUT_Y + INPUT_H};
  rc_prio = {cx1 - in_w - 8 - 110, INPUT_Y, cx1 - in_w - 8, INPUT_Y + INPUT_H};
  rc_add = {cx0, INPUT_Y, cx0 + 96, INPUT_Y + INPUT_H};
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
  RECT rt10 = rc_input;
  rt10.left += 12; rt10.right -= 12; rt10.top += 2; rt10.bottom -= 2;
  DrawTextW(mem, g_input_len ? g_input : hint, -1, &rt10,
            DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);

  const wchar_t* pl;
  COLORREF pc;
  if (g_tab == 1) { pl = PRIO_LABEL(g_prio); pc = PRIO_COLOR(g_prio); }
  else if (g_tab == 5) { pl = g_prio ? L"درآمد +" : L"هزینه −"; pc = g_prio ? GREEN : RED; }
  else { pl = L"—"; pc = DIM; }
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
  RECT addBtnR = rc_add; (void)addBtnR;
  FillRect(mem, &rc_add, ab);
  DeleteObject(ab);
  SetTextColor(mem, RGB(255, 255, 255));
  DrawTextW(mem, L"افزودن +", -1, &rc_add, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

  /* لیست */
  int total = item_count();
  if (total == 0) {
    SetTextColor(mem, DIM2);
    RECT re = {cx0, LIST_TOP + 30, cx1, LIST_TOP + 70};
    DrawTextW(mem, L"چیزی ثبت نشده — از نوار بالا اضافه کنید", -1, &re, DT_CENTER | DT_SINGLELINE);
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
    RECT rr = {cx0, y + 3, cx1, y + ROW_H - 3};
    card(mem, rr);

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
      RECT rtitle = {rr.left + 80, y + 4, cbx - 14, y + ROW_H - 4};
      DrawTextW(mem, t.title.c_str(), -1, &rtitle, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      RECT rp = {rr.left + 14, y + ROW_H / 2 - 13, rr.left + 68, y + ROW_H / 2 + 13};
      SelectObject(mem, g_f_small);
      SetTextColor(mem, PRIO_COLOR(t.prio));
      DrawTextW(mem, PRIO_LABEL(t.prio), -1, &rp, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else if (g_tab == 2) {
      Proj& p = g_projs[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rn3 = {rr.left + 100, y + 4, rr.right - 20, y + ROW_H - 4};
      DrawTextW(mem, p.name.c_str(), -1, &rn3, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
      RECT rst2 = {rr.left + 14, y + ROW_H / 2 - 13, rr.left + 88, y + ROW_H / 2 + 13};
      SelectObject(mem, g_f_small);
      SetTextColor(mem, PROJ_STATUS_COLOR(p.status));
      DrawTextW(mem, PROJ_STATUS(p.status), -1, &rst2, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else if (g_tab == 3) {
      Client& c = g_clients[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rn4 = {rr.left + 150, y + 4, rr.right - 20, y + ROW_H - 4};
      DrawTextW(mem, c.name.c_str(), -1, &rn4, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, CYAN2);
      RECT rph2 = {rr.left + 14, y + 4, rr.left + 140, y + ROW_H - 4};
      DrawTextW(mem, c.phone.c_str(), -1, &rph2, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
    } else if (g_tab == 4) {
      Note& n = g_notes[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rtext2 = {rr.left + 50, y + 4, rr.right - 40, y + ROW_H - 4};
      DrawTextW(mem, n.text.c_str(), -1, &rtext2, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SetTextColor(mem, n.pinned ? GOLD : DIM2);
      RECT rpin3 = {rr.right - 36, y, rr.right - 8, y + ROW_H};
      DrawTextW(mem, L"📌", -1, &rpin3, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else {
      Fin& f = g_fins[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rnote2 = {rr.left + 160, y + 4, rr.right - 150, y + ROW_H - 4};
      DrawTextW(mem, f.note.c_str(), -1, &rnote2, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SetTextColor(mem, f.income ? GREEN : RED);
      RECT ramt2 = {rr.right - 145, y + 4, rr.right - 16, y + ROW_H - 4};
      wchar_t amt[96];
      swprintf(amt, 96, L"%ls %ls", f.income ? L"+" : L"−", fmt_money(f.amount).c_str());
      DrawTextW(mem, amt, -1, &ramt2, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS);
      RECT rsign2 = {rr.left + 14, y, rr.left + 145, y + ROW_H};
      SetTextColor(mem, DIM);
      SelectObject(mem, g_f_small);
      DrawTextW(mem, f.income ? L"درآمد" : L"هزینه", -1, &rsign2, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    }
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
  RECT rc;
  GetClientRect(g_hwnd, &rc);
  int w = rc.right;
  /* سایدبار */
  if (x >= w - SB_W) {
    for (int i = 0; i < 3; i++) if (PtInRect(&rc_nav_main[i], POINT{x, y})) return 100 + i;
    for (int i = 0; i < 5; i++) if (PtInRect(&rc_nav_dept[i], POINT{x, y})) return 110 + i;
    if (PtInRect(&rc_nav_settings, POINT{x, y})) return 120;
    return 0;
  }
  if (!tab_has_input()) return 0;
  if (PtInRect(&rc_input, POINT{x, y})) return 1;
  if (PtInRect(&rc_prio, POINT{x, y})) return 2;
  if (PtInRect(&rc_add, POINT{x, y})) return 3;
  if (y >= LIST_TOP) {
    int idx = (y - LIST_TOP + g_scroll) / ROW_H;
    if (idx >= 0 && idx < item_count()) return 1000 + idx;
  }
  return 0;
}

static void do_click(int id) {
  if (id >= 100 && id < 103) { g_page = NAV_MAIN[id - 100].page; g_scroll = 0; }
  else if (id >= 110 && id < 115) { g_page = NAV_DEPTS[id - 110].page; g_tab = g_page - 3; g_scroll = 0; }
  else if (id == 120) { g_page = 8; g_scroll = 0; }
  else if (id == 1) g_input_focus = true;
  else if (id == 2) {
    if (g_tab == 1) g_prio = (g_prio + 2) % 3;
    else if (g_tab == 5) g_prio = g_prio ? 0 : 1;
  }
  else if (id == 3) commit_input();
  else if (id >= 1000) {
    int i = id - 1000;
    if (g_tab == 1 && i < (int)g_tasks.size()) g_tasks[i].done = !g_tasks[i].done;
    else if (g_tab == 2 && i < (int)g_projs.size()) g_projs[i].status = (g_projs[i].status + 1) % 4;
    else if (g_tab == 4 && i < (int)g_notes.size()) g_notes[i].pinned = !g_notes[i].pinned;
    save_all();
  }
  InvalidateRect(g_hwnd, NULL, FALSE);
}

static void do_rclick(int id) {
  if (id >= 1000) {
    int i = id - 1000;
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
      int sh = (id >= 100 && id < 103) ? id - 100
             : (id >= 110 && id < 115) ? 10 + id - 110
             : (id == 120) ? 20 : -1;
      if (id != g_hover || sh != sb_hover) {
        g_hover = id;
        sb_hover = sh;
        InvalidateRect(hwnd, NULL, FALSE);
      }
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
  int w = 1280, h = 800;
  g_hwnd = CreateWindowExW(WS_EX_LAYOUTRTL, L"NEXUSHQ_NATIVECORE", L"NEXUS HQ",
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
