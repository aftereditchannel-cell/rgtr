/**
 * NEXUS HQ — Native Edition v1.1 (ویندوز)
 * ========================================
 * ۱۰۰٪ Native — صفر وب. C++ خالص + Win32/GDI، UI کاملاً Owner-Drawn.
 * ماژول‌ها: تسک‌ها · یادداشت‌ها · مالی · درباره
 * فونت فارسی وزیرمتن داخل EXE تعبیه شده (AddFontMemResourceEx).
 *
 * Build:
 *   zig c++ -target x86_64-windows-gnu -O2 -municode -std=c++17 -w \
 *       app_native.cpp fonts_gen.cpp -o NEXUS-HQ-Native.exe -luser32 -lgdi32 -lshell32
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
#include <vector>
#include <string>
#include <stdlib.h>

#include "fonts_gen.hpp"

/* ------------------------------------------------------------ مدل داده */

struct Task { bool done; int prio; std::wstring title; };
struct Note { bool pinned; std::wstring text; };
struct Fin  { bool income; double amount; std::wstring note; };

static std::vector<Task> g_tasks;
static std::vector<Note> g_notes;
static std::vector<Fin>  g_fins;
static wchar_t g_dir[MAX_PATH];

static const wchar_t* PRIO_LABEL(int p) {
  static const wchar_t* L[3] = {L"پایین", L"متوسط", L"بالا"};
  return L[p];
}
static COLORREF PRIO_COLOR(int p) {
  static const COLORREF C[3] = {RGB(94, 130, 110), RGB(245, 158, 11), RGB(239, 68, 68)};
  return C[p];
}

/* ------------------------------------------------------------ ذخیره‌سازی */

static std::wstring esc(const std::wstring& s) {
  std::wstring o;
  for (wchar_t c : s) o += (c == L'\t' || c == L'\n' || c == L'\r') ? L' ' : c;
  return o;
}
static std::vector<std::wstring> split_lines(const std::wstring& s) {
  std::vector<std::wstring> out;
  std::wstring cur;
  for (wchar_t c : s) {
    if (c == L'\n') { out.push_back(cur); cur.clear(); }
    else cur += c;
  }
  if (!cur.empty()) out.push_back(cur);
  return out;
}

static void db_init() {
  wchar_t base[MAX_PATH];
  if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base)))
    GetTempPathW(MAX_PATH, base);
  wcscat(base, L"\\NEXUS-HQ-Native");
  CreateDirectoryW(base, NULL);
  wcscat(base, L"\\");
  wcscat(base, L"");  // (بدون تغییر)
  swprintf(g_dir, MAX_PATH, L"%s", base);
}

template <typename F>
static void for_line(const wchar_t* file, F fn) {
  wchar_t path[MAX_PATH];
  swprintf(path, MAX_PATH, L"%s%s", g_dir, file);
  FILE* f = _wfopen(path, L"r, ccs=UTF-8");
  if (!f) return;
  wchar_t line[1200];
  while (fgetws(line, 1200, f)) fn(std::wstring(line));
  fclose(f);
}
static void write_all(const wchar_t* file, const std::wstring& content) {
  wchar_t path[MAX_PATH];
  swprintf(path, MAX_PATH, L"%s%s", g_dir, file);
  FILE* f = _wfopen(path, L"w, ccs=UTF-8");
  if (!f) return;
  fputws(content.c_str(), f);
  fclose(f);
}

static void save_all() {
  std::wstring t;
  for (auto& x : g_tasks)
    t += std::to_wstring(x.done ? 1 : 0) + L"\t" + std::to_wstring(x.prio) + L"\t" + esc(x.title) + L"\n";
  write_all(L"tasks.db", t);
  std::wstring n;
  for (auto& x : g_notes) n += std::to_wstring(x.pinned ? 1 : 0) + L"\t" + esc(x.text) + L"\n";
  write_all(L"notes.db", n);
  std::wstring f;
  for (auto& x : g_fins) {
    wchar_t amt[64];
    swprintf(amt, 64, L"%.2f", x.amount);
    f += std::to_wstring(x.income ? 1 : 0) + L"\t" + amt + L"\t" + esc(x.note) + L"\n";
  }
  write_all(L"finance.db", f);
}

static void load_all() {
  for_line(L"tasks.db", [](const std::wstring& line) {
    int done = 0, prio = 1;
    wchar_t title[900] = {0};
    if (swscanf(line.c_str(), L"%d\t%d\t%899[^\n]", &done, &prio, title) == 3) {
      Task t{done != 0, prio < 0 || prio > 2 ? 1 : prio, title};
      size_t e = t.title.size();
      while (e && (t.title[e - 1] == L'\n' || t.title[e - 1] == L'\r')) e--;
      t.title.resize(e);
      g_tasks.push_back(t);
    }
  });
  for_line(L"notes.db", [](const std::wstring& line) {
    int pin = 0;
    wchar_t text[1100] = {0};
    if (swscanf(line.c_str(), L"%d\t%1099[^\n]", &pin, text) == 2) {
      Note n{pin != 0, text};
      size_t e = n.text.size();
      while (e && (n.text[e - 1] == L'\n' || n.text[e - 1] == L'\r')) e--;
      n.text.resize(e);
      g_notes.push_back(n);
    }
  });
  for_line(L"finance.db", [](const std::wstring& line) {
    int inc = 0;
    double amt = 0;
    wchar_t note[900] = {0};
    if (swscanf(line.c_str(), L"%d\t%lf\t%899[^\n]", &inc, &amt, note) == 3) {
      Fin f{inc != 0, amt, note};
      size_t e = f.note.size();
      while (e && (f.note[e - 1] == L'\n' || f.note[e - 1] == L'\r')) e--;
      f.note.resize(e);
      g_fins.push_back(f);
    }
  });
}

/* ------------------------------------------------------------ UI پایه */

static const COLORREF BG = RGB(8, 9, 12);
static const COLORREF PANEL = RGB(17, 20, 27);
static const COLORREF PANEL2 = RGB(23, 27, 36);
static const COLORREF LINE = RGB(30, 34, 44);
static const COLORREF TX = RGB(232, 234, 240);
static const COLORREF DIM = RGB(139, 147, 167);
static const COLORREF DIM2 = RGB(93, 101, 119);
static const COLORREF ACC = RGB(99, 102, 241);
static const COLORREF GREEN = RGB(34, 197, 94);
static const COLORREF RED = RGB(239, 68, 68);
static const COLORREF GOLD = RGB(245, 158, 11);

static HWND g_hwnd;
static HFONT g_f_title, g_f_body, g_f_small, g_f_huge;
static int g_tab = 0;             // 0=تسک‌ها 1=یادداشت‌ها 2=مالی 3=درباره
static wchar_t g_input[256] = {0};
static int g_input_len = 0;
static bool g_input_focus = true;
static int g_prio = 1;            // تسک: اولویت · مالی: 0=هزینه 1=درآمد
static int g_hover = 0;
static int g_scroll = 0;

static const int TABS_Y = 78;
static const int TAB_H = 34;
static const int INPUT_Y = 124;
static const int INPUT_H = 40;
static const int ROW_H = 44;
static const int LIST_TOP = 178;
static const int PAD = 18;

static RECT rc_input, rc_prio, rc_add, rc_tab[4];
static const wchar_t* TAB_NAMES[4] = {L"تسک‌ها", L"یادداشت‌ها", L"مالی", L"درباره"};

static void relayout() {
  RECT rc;
  GetClientRect(g_hwnd, &rc);
  int w = rc.right;
  int bw = 96, pw = 110;
  rc_add = {PAD, INPUT_Y, PAD + bw, INPUT_Y + INPUT_H};
  rc_prio = {PAD + bw + 8, INPUT_Y, PAD + bw + 8 + pw, INPUT_Y + INPUT_H};
  rc_input = {PAD + bw + 8 + pw + 8, INPUT_Y, w - PAD, INPUT_Y + INPUT_H};
  // تب‌ها از راست
  int x = w - PAD;
  for (int i = 0; i < 4; i++) {
    int tw = 108;
    rc_tab[i] = {x - tw, TABS_Y, x, TABS_Y + TAB_H};
    x -= tw + 6;
  }
}

static int g_w = 0, g_h = 0;

/* تعداد اقلام تب فعلی */
static int item_count() {
  if (g_tab == 0) return (int)g_tasks.size();
  if (g_tab == 1) return (int)g_notes.size();
  if (g_tab == 2) return (int)g_fins.size();
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

static void paint(HDC mem, RECT& rc) {
  int w = rc.right, h = rc.bottom;
  g_w = w; g_h = h;

  HBRUSH bg = CreateSolidBrush(BG);
  FillRect(mem, &rc, bg);
  DeleteObject(bg);
  SetBkMode(mem, TRANSPARENT);

  /* ---------- سربرگ ---------- */
  SelectObject(mem, g_f_title);
  SetTextColor(mem, TX);
  RECT r1 = {PAD, 12, w - PAD, 50};
  DrawTextW(mem, L"NEXUS HQ — Native", -1, &r1, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);
  SelectObject(mem, g_f_small);
  SetTextColor(mem, DIM2);
  RECT r0 = {PAD, 44, w - PAD, 66};
  DrawTextW(mem, L"۱۰۰٪ Native · صفر وب · v1.1", -1, &r0, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  /* ---------- تب‌ها ---------- */
  SelectObject(mem, g_f_small);
  for (int i = 0; i < 4; i++) {
    bool on = i == g_tab;
    HBRUSH tb = CreateSolidBrush(on ? ACC : (g_hover == 10 + i ? PANEL2 : PANEL));
    FillRect(mem, &rc_tab[i], tb);
    DeleteObject(tb);
    SetTextColor(mem, on ? RGB(255, 255, 255) : DIM);
    DrawTextW(mem, TAB_NAMES[i], -1, &rc_tab[i], DT_CENTER | DT_VCENTER | DT_SINGLELINE);
  }

  /* ---------- نوار آمار ---------- */
  SelectObject(mem, g_f_small);
  SetTextColor(mem, DIM);
  RECT rs = {PAD, TABS_Y + TAB_H + 6, w - PAD, INPUT_Y - 2};
  wchar_t s[400] = {0};
  if (g_tab == 0) {
    int done = 0;
    for (auto& t : g_tasks) if (t.done) done++;
    swprintf(s, 400, L"کل: %d   ·   انجام‌شده: %d   ·   در انتظار: %d", (int)g_tasks.size(), done, (int)g_tasks.size() - done);
  } else if (g_tab == 1) {
    int pin = 0;
    for (auto& n : g_notes) if (n.pinned) pin++;
    swprintf(s, 400, L"یادداشت‌ها: %d   ·   سنجاق‌شده: %d", (int)g_notes.size(), pin);
  } else if (g_tab == 2) {
    double inc = 0, exp = 0;
    for (auto& f : g_fins) f.income ? inc += f.amount : exp += f.amount;
    swprintf(s, 400, L"درآمد: %ls   ·   هزینه: %ls   ·   مانده: %ls",
             fmt_money(inc).c_str(), fmt_money(exp).c_str(), fmt_money(inc - exp).c_str());
  } else {
    swprintf(s, 400, L"درباره برنامه");
  }
  DrawTextW(mem, s, -1, &rs, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  /* ---------- صفحه‌ی درباره ---------- */
  if (g_tab == 3) {
    SelectObject(mem, g_f_body);
    SetTextColor(mem, TX);
    const wchar_t* lines[] = {
      L"NEXUS HQ — Native Edition v1.1",
      L"",
      L"این برنامه ۱۰۰٪ Native است:",
      L"ویندوز: C++ خالص + Win32/GDI — بدون WebView، بدون .NET، بدون runtime",
      L"فونت فارسی وزیرمتن داخل خود برنامه تعبیه شده است",
      L"",
      L"ماژول‌ها: تسک‌ها (اولویت/انجام) · یادداشت‌ها (سنجاق) · مالی (درآمد/هزینه)",
      L"",
      L"راهنما:",
      L"• تسک‌ها: متن را بنویسید و Enter — کلیک = انجام‌شده — راست‌کلیک = حذف — دکمه‌ی اولویت برای چرخش",
      L"• یادداشت‌ها: متن و Enter — کلیک = سنجاق — راست‌کلیک = حذف",
      L"• مالی: مبلغ را بنویسید (و در صورت نیاز توضیح) و Enter — دکمه = نوع (درآمد/هزینه)",
      L"",
      L"داده‌ها در %LOCALAPPDATA%\\NEXUS-HQ-Native ذخیره می‌شوند",
      L"سورس کامل: github.com/aftereditchannel-cell/rgtr",
    };
    int y = LIST_TOP + 6;
    for (auto& ln : lines) {
      RECT rl = {PAD + 260, y, w - PAD, y + 26};
      DrawTextW(mem, ln, -1, &rl, DT_RIGHT | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      y += 28;
    }
    return;
  }

  /* ---------- نوار ورود ---------- */
  SelectObject(mem, g_f_body);
  SetTextColor(mem, g_input_len ? TX : DIM2);
  const wchar_t* hint = g_tab == 0 ? L"عنوان تسک جدید…"
                    : g_tab == 1 ? L"یادداشت جدید…"
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

  // دکمه‌ی حالت
  const wchar_t* pl;
  COLORREF pc;
  if (g_tab == 0) { pl = PRIO_LABEL(g_prio); pc = PRIO_COLOR(g_prio); }
  else if (g_tab == 1) { pl = L"یادداشت"; pc = ACC; }
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

  // افزودن
  HBRUSH ab = CreateSolidBrush(g_hover == 3 ? RGB(79, 82, 168) : ACC);
  FillRect(mem, &rc_add, ab);
  DeleteObject(ab);
  SetTextColor(mem, RGB(255, 255, 255));
  DrawTextW(mem, L"افزودن +", -1, &rc_add, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

  /* ---------- لیست ---------- */
  int total = item_count();
  if (total == 0) {
    SetTextColor(mem, DIM2);
    RECT re = {PAD, LIST_TOP + 40, w - PAD, LIST_TOP + 90};
    const wchar_t* em = g_tab == 0 ? L"هنوز تسکی نیست — اولین را بالا بنویسید"
                      : g_tab == 1 ? L"یادداشتی نیست — اولین را بالا بنویسید"
                                   : L"تراکنشی ثبت نشده — مبلغ را وارد کنید";
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

    if (g_tab == 0) {
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
      RECT rtitle = {rr.left + 100, y + 4, cbx - 14, y + ROW_H - 4};
      DrawTextW(mem, t.title.c_str(), -1, &rtitle, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      RECT rp = {rr.left + 14, y + ROW_H / 2 - 13, rr.left + 78, y + ROW_H / 2 + 13};
      HPEN tp = CreatePen(PS_SOLID, 1, PRIO_COLOR(t.prio));
      oldpen = (HPEN)SelectObject(mem, tp);
      SelectObject(mem, GetStockObject(NULL_BRUSH));
      Rectangle(mem, rp.left, rp.top, rp.right, rp.bottom);
      SelectObject(mem, oldpen);
      DeleteObject(tp);
      SelectObject(mem, g_f_small);
      SetTextColor(mem, PRIO_COLOR(t.prio));
      DrawTextW(mem, PRIO_LABEL(t.prio), -1, &rp, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
      SetTextColor(mem, DIM2);
      RECT rx = {rr.left + 86, y, rr.left + 100, y + ROW_H};
      SelectObject(mem, g_f_body);
      DrawTextW(mem, L"✕", -1, &rx, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else if (g_tab == 1) {
      Note& n = g_notes[i];
      SelectObject(mem, g_f_body);
      SetTextColor(mem, TX);
      RECT rtext = {rr.left + 60, y + 4, rr.right - 40, y + ROW_H - 4};
      DrawTextW(mem, n.text.c_str(), -1, &rtext, DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
      SetTextColor(mem, n.pinned ? GOLD : DIM2);
      RECT rpin = {rr.right - 38, y, rr.right - 8, y + ROW_H};
      DrawTextW(mem, L"📌", -1, &rpin, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
      SetTextColor(mem, DIM2);
      RECT rx = {rr.left + 24, y, rr.left + 50, y + ROW_H};
      DrawTextW(mem, L"✕", -1, &rx, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
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
      DrawTextW(mem, amt, -1, &ramt, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);
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

/* ------------------------------------------------------------ منطق */

static void commit_input() {
  std::wstring s(g_input);
  size_t a = s.find_first_not_of(L" \t"), b = s.find_last_not_of(L" \t");
  if (a == std::wstring::npos) return;
  s = s.substr(a, b - a + 1);
  if (g_tab == 0) {
    Task t{false, g_prio, s};
    g_tasks.insert(g_tasks.begin(), t);
  } else if (g_tab == 1) {
    Note n{false, s};
    g_notes.insert(g_notes.begin(), n);
  } else {
    // مبلغ + توضیح اختیاری (اولین فاصله جدا می‌کند)
    double amt = 0;
    wchar_t note[200] = {0};
    if (swscanf(s.c_str(), L"%lf %199[^\n]", &amt, note) >= 1 && amt != 0) {
      Fin f{g_prio != 0, amt, note};
      g_fins.insert(g_fins.begin(), f);
    } else return;
  }
  g_input[0] = 0;
  g_input_len = 0;
  save_all();
  InvalidateRect(g_hwnd, NULL, FALSE);
}

static int area_id(int x, int y) {
  for (int i = 0; i < 4; i++) if (PtInRect(&rc_tab[i], POINT{x, y})) return 10 + i;
  if (g_tab == 3) return 0;
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
  if (id >= 10 && id <= 13) { g_tab = id - 10; g_scroll = 0; }
  else if (id == 1) g_input_focus = true;
  else if (id == 2) {
    if (g_tab == 0) g_prio = (g_prio + 2) % 3;
    else if (g_tab == 2) g_prio = g_prio ? 0 : 1;
  }
  else if (id == 3) commit_input();
  else if (id >= 100) {
    int i = id - 100;
    if (g_tab == 0) g_tasks[i].done = !g_tasks[i].done;
    else if (g_tab == 1) g_notes[i].pinned = !g_notes[i].pinned;
    else {} // مالی: کلیک فقط انتخاب است
    save_all();
  }
  InvalidateRect(g_hwnd, NULL, FALSE);
}

static void do_rclick(int id) {
  if (id >= 100) {
    int i = id - 100;
    if (g_tab == 0 && i < (int)g_tasks.size()) g_tasks.erase(g_tasks.begin() + i);
    else if (g_tab == 1 && i < (int)g_notes.size()) g_notes.erase(g_notes.begin() + i);
    else if (g_tab == 2 && i < (int)g_fins.size()) g_fins.erase(g_fins.begin() + i);
    save_all();
    InvalidateRect(g_hwnd, NULL, FALSE);
  }
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
    case WM_CREATE:
      g_hwnd = hwnd;
      relayout();
      return 0;
    case WM_SIZE:
      relayout();
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
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
    case WM_LBUTTONDOWN:
      do_click(area_id(GET_X_LPARAM(l), GET_Y_LPARAM(l)));
      return 0;
    case WM_RBUTTONDOWN:
      do_rclick(area_id(GET_X_LPARAM(l), GET_Y_LPARAM(l)));
      return 0;
    case WM_CHAR:
      if (!g_input_focus || g_tab == 3) return 0;
      if (w == VK_BACK) {
        if (g_input_len > 0) g_input[--g_input_len] = 0;
      } else if (w == L'\r') {
        commit_input();
      } else if (w >= 32 && w != 127 && g_input_len < 250) {
        g_input[g_input_len++] = (wchar_t)w;
        g_input[g_input_len] = 0;
      }
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
    case WM_ERASEBKGND:
      return 1;
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
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProcW(hwnd, m, w, l);
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
  (void)prev; (void)cmd;
  SetProcessDPIAware();
  db_init();
  load_all();

  // فونت فارسی وزیرمتن — از داخل EXE
  DWORD cnt = 0;
  AddFontMemResourceEx((void*)FONT_REG, (DWORD)FONT_REG_SIZE, NULL, &cnt);
  AddFontMemResourceEx((void*)FONT_BOLD, (DWORD)FONT_BOLD_SIZE, NULL, &cnt);

  g_f_title = CreateFontW(28, 0, 0, 0, FW_BOLD, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");
  g_f_body = CreateFontW(18, 0, 0, 0, FW_NORMAL, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");
  g_f_small = CreateFontW(15, 0, 0, 0, FW_NORMAL, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Vazirmatn");

  WNDCLASSW wc = {0};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = inst;
  wc.hCursor = LoadCursorW(NULL, IDC_ARROW);
  wc.hbrBackground = CreateSolidBrush(BG);
  wc.lpszClassName = L"NEXUSHQ_NATIVE";
  RegisterClassW(&wc);

  int sw = GetSystemMetrics(SM_CXSCREEN), sh = GetSystemMetrics(SM_CYSCREEN);
  int w = 860, h = 680;
  g_hwnd = CreateWindowExW(WS_EX_LAYOUTRTL, L"NEXUSHQ_NATIVE", L"NEXUS HQ — Native",
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

  // آیکون از کنار EXE
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
