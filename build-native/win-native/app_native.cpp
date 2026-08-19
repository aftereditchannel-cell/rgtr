/**
 * NEXUS HQ — Native Edition (ویندوز)
 * ====================================
 * ۱۰۰٪ Native ویندوز — صفر وب، صفر WebView، صفر Electron.
 * UI کاملاً Owner-Drawn با GDI، تم تیره، راست‌چین فارسی.
 * داده‌ها در %LOCALAPPDATA%\NEXUS-HQ-Native\tasks.db (TSV)
 *
 * Build:
 *   zig c++ -target x86_64-windows-gnu -O2 -municode app_native.cpp -o NEXUS-HQ-Native.exe \
 *       -luser32 -lgdi32 -lshell32 -ldwmapi
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

/* ------------------------------------------------------------ داده‌ها */

struct Task {
  int id = 0;
  bool done = false;
  int prio = 1;          // 0=پایین 1=متوسط 2=بالا
  std::wstring title;
};

static std::vector<Task> g_tasks;
static int g_next_id = 1;
static wchar_t g_db_path[MAX_PATH];

static const wchar_t* PRIO_LABEL(int p) {
  static const wchar_t* L[3] = {L"پایین", L"متوسط", L"بالا"};
  return L[p];
}
static COLORREF PRIO_COLOR(int p) {
  static const COLORREF C[3] = {RGB(94, 130, 110), RGB(245, 158, 11), RGB(239, 68, 68)};
  return C[p];
}

static void db_init() {
  wchar_t base[MAX_PATH];
  if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base))) {
    GetTempPathW(MAX_PATH, base);
    wcscat(base, L"NEXUS-HQ-Native");
  } else {
    wcscat(base, L"\\NEXUS-HQ-Native");
  }
  CreateDirectoryW(base, NULL);
  swprintf(g_db_path, MAX_PATH, L"%s\\tasks.db", base);
}

static std::wstring escape(const std::wstring& s) {
  std::wstring o;
  for (wchar_t c : s) o += (c == L'\t' || c == L'\n' || c == L'\r') ? L' ' : c;
  return o;
}

static void save() {
  FILE* f = _wfopen(g_db_path, L"w, ccs=UTF-8");
  if (!f) return;
  for (auto& t : g_tasks) {
    fwprintf(f, L"%d\t%d\t%d\t%s\n", t.id, t.done ? 1 : 0, t.prio, escape(t.title).c_str());
  }
  fclose(f);
}

static void load() {
  FILE* f = _wfopen(g_db_path, L"r, ccs=UTF-8");
  if (!f) return;
  wchar_t line[1024];
  while (fgetws(line, 1024, f)) {
    int id = 0, done = 0, prio = 1;
    wchar_t title[900] = {0};
    if (swscanf(line, L"%d\t%d\t%d\t%899[^\n]", &id, &done, &prio, title) == 4) {
      Task t;
      t.id = id; t.done = done != 0;
      t.prio = prio < 0 || prio > 2 ? 1 : prio;
      t.title = title;
      size_t e = t.title.size();
      while (e && (t.title[e - 1] == L'\n' || t.title[e - 1] == L'\r')) e--;
      t.title.resize(e);
      g_tasks.push_back(t);
      if (id >= g_next_id) g_next_id = id + 1;
    }
  }
  fclose(f);
}

/* ------------------------------------------------------------ UI */

static const COLORREF BG = RGB(8, 9, 12);
static const COLORREF PANEL = RGB(17, 20, 27);
static const COLORREF LINE = RGB(30, 34, 44);
static const COLORREF TX = RGB(232, 234, 240);
static const COLORREF DIM = RGB(139, 147, 167);
static const COLORREF ACC = RGB(99, 102, 241);

static HWND g_hwnd;
static HFONT g_f_title, g_f_body, g_f_small;
static wchar_t g_input[256] = {0};
static int g_input_len = 0;
static bool g_input_focus = true;
static int g_input_prio = 1;
static int g_hover = -1;  // id ناحیه‌ی hover

static const int HEADER_H = 150;
static const int INPUT_H = 40;
static const int ROW_H = 44;
static const int PAD = 18;

static RECT rc_input, rc_prio, rc_add;

static int g_scroll = 0;  // offset اسکرول لیست

static int area_id(int x, int y) {
  if (PtInRect(&rc_input, POINT{x, y})) return 1;
  if (PtInRect(&rc_prio, POINT{x, y})) return 2;
  if (PtInRect(&rc_add, POINT{x, y})) return 3;
  // ردیف‌ها
  RECT rc;
  GetClientRect(g_hwnd, &rc);
  int list_top = HEADER_H;
  int idx = (y - list_top + g_scroll) / ROW_H;
  if (y >= list_top && idx >= 0 && (size_t)idx < g_tasks.size()) return 100 + idx;
  return 0;
}

static void stats(int* total, int* done, int* pending) {
  *total = (int)g_tasks.size();
  *done = 0;
  for (auto& t : g_tasks) if (t.done) (*done)++;
  *pending = *total - *done;
}

static void relayout() {
  RECT rc;
  GetClientRect(g_hwnd, &rc);
  int w = rc.right;
  // چیدمان راست‌به‌چپ: ورودی از راست، دکمه‌ها در ادامه
  int y = HEADER_H - INPUT_H - 16;
  int btn_w = 96;
  int prio_w = 84;
  rc_add = {PAD, y, PAD + btn_w, y + INPUT_H};
  rc_prio = {PAD + btn_w + 8, y, PAD + btn_w + 8 + prio_w, y + INPUT_H};
  rc_input = {PAD + btn_w + 8 + prio_w + 8, y, w - PAD, y + INPUT_H};
}

static void paint(HDC dc, RECT& rc) {
  int w = rc.right, h = rc.bottom;

  HDC mem = CreateCompatibleDC(dc);
  HBITMAP bm = CreateCompatibleBitmap(dc, w, h);
  HBITMAP old = (HBITMAP)SelectObject(mem, bm);

  HBRUSH bg = CreateSolidBrush(BG);
  FillRect(mem, &rc, bg);
  DeleteObject(bg);

  SetBkMode(mem, TRANSPARENT);

  /* ---------- سربرگ ---------- */
  SelectObject(mem, g_f_title);
  SetTextColor(mem, TX);
  RECT r1 = {PAD, 14, w - PAD, 50};
  DrawTextW(mem, L"NEXUS HQ — Native", -1, &r1, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  SelectObject(mem, g_f_small);
  int total, done, pending;
  stats(&total, &done, &pending);
  wchar_t s[256];
  swprintf(s, 256, L"۱۰۰%% Native · صفر وب   |   کل: %d   انجام‌شده: %d   در انتظار: %d", total, done, pending);
  SetTextColor(mem, DIM);
  RECT r2 = {PAD, 48, w - PAD, 70};
  DrawTextW(mem, s, -1, &r2, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

  /* ---------- نوار ورود ---------- */
  // ورودی متن
  HBRUSH pin = CreateSolidBrush(PANEL);
  FillRect(mem, &rc_input, pin);
  DeleteObject(pin);
  HPEN fr = CreatePen(PS_SOLID, g_input_focus ? 2 : 1, g_input_focus ? ACC : LINE);
  HPEN oldpen = (HPEN)SelectObject(mem, fr);
  SelectObject(mem, GetStockObject(NULL_BRUSH));
  Rectangle(mem, rc_input.left, rc_input.top, rc_input.right, rc_input.bottom);
  SelectObject(mem, oldpen);
  DeleteObject(fr);

  SelectObject(mem, g_f_body);
  SetTextColor(mem, g_input_len ? TX : DIM);
  RECT rt = rc_input;
  rt.left += 12; rt.right -= 12; rt.top += 2; rt.bottom -= 2;
  DrawTextW(mem, g_input_len ? g_input : L"عنوان تسک جدید…", -1, &rt,
            DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS);

  // چیپ اولویت
  pin = CreateSolidBrush(g_hover == 2 ? RGB(35, 40, 52) : PANEL);
  FillRect(mem, &rc_prio, pin);
  DeleteObject(pin);
  HPEN pp = CreatePen(PS_SOLID, 1, PRIO_COLOR(g_input_prio));
  oldpen = (HPEN)SelectObject(mem, pp);
  SelectObject(mem, GetStockObject(NULL_BRUSH));
  Rectangle(mem, rc_prio.left, rc_prio.top, rc_prio.right, rc_prio.bottom);
  SelectObject(mem, oldpen);
  DeleteObject(pp);
  SetTextColor(mem, PRIO_COLOR(g_input_prio));
  DrawTextW(mem, PRIO_LABEL(g_input_prio), -1, &rc_prio, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

  // دکمه‌ی افزودن
  HBRUSH ab = CreateSolidBrush(g_hover == 3 ? RGB(79, 82, 168) : ACC);
  FillRect(mem, &rc_add, ab);
  DeleteObject(ab);
  SetTextColor(mem, RGB(255, 255, 255));
  DrawTextW(mem, L"افزودن +", -1, &rc_add, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

  /* ---------- لیست ---------- */
  int list_top = HEADER_H;
  if (total == 0) {
    SetTextColor(mem, DIM);
    RECT re = {PAD, list_top + 40, w - PAD, list_top + 90};
    DrawTextW(mem, L"هنوز تسکی نیست — اولین را بالا بنویسید", -1, &re, DT_CENTER | DT_SINGLELINE);
  }

  int max_visible = (h - list_top - PAD) / ROW_H;
  if (max_visible < 1) max_visible = 1;
  int max_scroll = ((int)g_tasks.size() - max_visible) * ROW_H;
  if (max_scroll < 0) max_scroll = 0;
  if (g_scroll > max_scroll) g_scroll = max_scroll;
  if (g_scroll < 0) g_scroll = 0;

  for (int i = g_scroll / ROW_H; (size_t)i < g_tasks.size(); i++) {
    int y = list_top + (i * ROW_H - g_scroll);
    if (y + ROW_H > h) break;
    Task& t = g_tasks[i];

    // پس‌زمینه‌ی ردیف
    RECT rr = {PAD, y + 3, w - PAD, y + ROW_H - 3};
    HBRUSH rb = CreateSolidBrush(g_hover == 100 + i ? RGB(23, 27, 36) : PANEL);
    FillRect(mem, &rr, rb);
    DeleteObject(rb);

    // چک‌باکس (سمت راست)
    int cb = 22;
    int cbx = rr.right - 34, cby = y + ROW_H / 2 - cb / 2;
    HPEN cp = CreatePen(PS_SOLID, 2, t.done ? RGB(34, 197, 94) : DIM);
    oldpen = (HPEN)SelectObject(mem, cp);
    SelectObject(mem, GetStockObject(NULL_BRUSH));
    Rectangle(mem, cbx, cby, cbx + cb, cby + cb);
    SelectObject(mem, oldpen);
    DeleteObject(cp);
    if (t.done) {
      HPEN gp = CreatePen(PS_SOLID, 3, RGB(34, 197, 94));
      oldpen = (HPEN)SelectObject(mem, gp);
      MoveToEx(mem, cbx + 5, cby + cb / 2, NULL);
      LineTo(mem, cbx + cb / 2 - 1, cby + cb - 5);
      LineTo(mem, cbx + cb - 4, cby + 5);
      SelectObject(mem, oldpen);
      DeleteObject(gp);
    }

    // عنوان
    SelectObject(mem, g_f_body);
    SetTextColor(mem, t.done ? DIM : TX);
    RECT rtitle = {rr.left + 100, y + 4, cbx - 14, y + ROW_H - 4};
    UINT fmt = DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS;
    DrawTextW(mem, t.title.c_str(), -1, &rtitle, fmt);

    // چیپ اولویت (سمت چپ عنوان)
    int pw = 64;
    RECT rp = {rr.left + 14, y + ROW_H / 2 - 13, rr.left + 14 + pw, y + ROW_H / 2 + 13};
    HBRUSH pb = CreateSolidBrush(PRIO_COLOR(t.prio));
    // چیپ توپر کم‌رنگ: قاب رنگی
    DeleteObject(pb);
    HPEN tp = CreatePen(PS_SOLID, 1, PRIO_COLOR(t.prio));
    oldpen = (HPEN)SelectObject(mem, tp);
    SelectObject(mem, GetStockObject(NULL_BRUSH));
    Rectangle(mem, rp.left, rp.top, rp.right, rp.bottom);
    SelectObject(mem, oldpen);
    DeleteObject(tp);
    SelectObject(mem, g_f_small);
    SetTextColor(mem, PRIO_COLOR(t.prio));
    DrawTextW(mem, PRIO_LABEL(t.prio), -1, &rp, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    // دکمه‌ی حذف ✕ (چپ‌ترین)
    RECT rx = {rr.left + pw + 26, y, rr.left + pw + 54, y + ROW_H};
    SetTextColor(mem, DIM);
    SelectObject(mem, g_f_body);
    DrawTextW(mem, L"✕", -1, &rx, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
  }

  // اسکرول‌بار عمودی اگر لازم شد
  if ((int)g_tasks.size() > max_visible) {
    int sb_h = (h - list_top - PAD) * max_visible / (int)g_tasks.size();
    if (sb_h < 24) sb_h = 24;
    int track = h - list_top - PAD - sb_h;
    int sb_y = list_top + (max_scroll > 0 ? (g_scroll * track / max_scroll) : 0);
    RECT sb = {w - 6, sb_y, w - 2, sb_y + sb_h};
    HBRUSH sbb = CreateSolidBrush(RGB(51, 59, 77));
    FillRect(mem, &sb, sbb);
    DeleteObject(sbb);
  }

  SelectObject(mem, old);
  BitBlt(dc, 0, 0, w, h, mem, 0, 0, SRCCOPY);
  DeleteObject(bm);
  DeleteDC(mem);
}

/* ------------------------------------------------------------ منطق */

static void add_task() {
  std::wstring s(g_input);
  // trim
  size_t a = s.find_first_not_of(L" \t"), b = s.find_last_not_of(L" \t");
  if (a == std::wstring::npos) return;
  s = s.substr(a, b - a + 1);
  if (s.empty()) return;
  Task t;
  t.id = g_next_id++;
  t.prio = g_input_prio;
  t.title = s;
  g_tasks.insert(g_tasks.begin(), t);  // جدیدها بالا
  g_input[0] = 0; g_input_len = 0;
  save();
  InvalidateRect(g_hwnd, NULL, FALSE);
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
      POINT p = {GET_X_LPARAM(l), GET_Y_LPARAM(l)};
      int id = area_id(p.x, p.y);
      if (id != g_hover) { g_hover = id; InvalidateRect(hwnd, NULL, FALSE); }
      return 0;
    }
    case WM_MOUSEWHEEL: {
      int d = GET_WHEEL_DELTA_WPARAM(w);
      g_scroll -= d / 3;
      if (g_scroll < 0) g_scroll = 0;
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
    }
    case WM_LBUTTONDOWN: {
      POINT p = {GET_X_LPARAM(l), GET_Y_LPARAM(l)};
      int id = area_id(p.x, p.y);
      if (id == 1) { g_input_focus = true; }
      else if (id == 2) { g_input_prio = (g_input_prio + 2) % 3; }  // پایین→بالا→متوسط (چرخه‌ی راست‌چین)
      else if (id == 3) { add_task(); }
      else if (id >= 100) {
        int idx = id - 100;
        RECT rc;
        GetClientRect(hwnd, &rc);
        Task& t = g_tasks[idx];
        // کلیک روی چک‌باکس یا هرجای ردیف = toggle
        t.done = !t.done;
        save();
      }
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
    }
    case WM_RBUTTONDOWN: {
      // کلیک راست روی ردیف = حذف
      POINT p = {GET_X_LPARAM(l), GET_Y_LPARAM(l)};
      int id = area_id(p.x, p.y);
      if (id >= 100) {
        g_tasks.erase(g_tasks.begin() + (id - 100));
        save();
        InvalidateRect(hwnd, NULL, FALSE);
      }
      return 0;
    }
    case WM_CHAR: {
      if (!g_input_focus) return 0;
      if (w == VK_BACK) {
        if (g_input_len > 0) g_input[--g_input_len] = 0;
      } else if (w == L'\r') {
        add_task();
      } else if (w >= 32 && w != 127 && g_input_len < 250) {
        g_input[g_input_len++] = (wchar_t)w;
        g_input[g_input_len] = 0;
      }
      InvalidateRect(hwnd, NULL, FALSE);
      return 0;
    }
    case WM_ERASEBKGND:
      return 1;
    case WM_PAINT: {
      PAINTSTRUCT ps;
      HDC dc = BeginPaint(hwnd, &ps);
      RECT rc;
      GetClientRect(hwnd, &rc);
      paint(dc, rc);
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
  load();

  g_f_title = CreateFontW(26, 0, 0, 0, FW_SEMIBOLD, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
  g_f_body = CreateFontW(17, 0, 0, 0, FW_NORMAL, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
  g_f_small = CreateFontW(14, 0, 0, 0, FW_NORMAL, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");

  WNDCLASSW wc = {0};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = inst;
  wc.hCursor = LoadCursorW(NULL, IDC_ARROW);
  wc.hbrBackground = CreateSolidBrush(BG);
  wc.lpszClassName = L"NEXUSHQ_NATIVE";
  RegisterClassW(&wc);

  int sw = GetSystemMetrics(SM_CXSCREEN), sh = GetSystemMetrics(SM_CYSCREEN);
  int w = 720, h = 640;
  g_hwnd = CreateWindowExW(WS_EX_LAYOUTRTL, L"NEXUSHQ_NATIVE",
                           L"NEXUS HQ — Native",
                           WS_OVERLAPPEDWINDOW,
                           (sw - w) / 2, (sh - h) / 2, w, h, NULL, NULL, inst, NULL);
  if (!g_hwnd) return 1;

  // نوار عنوان تیره
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

  ShowWindow(g_hwnd, show);
  UpdateWindow(g_hwnd);

  MSG msg;
  while (GetMessageW(&msg, NULL, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }
  return (int)msg.wParam;
}
