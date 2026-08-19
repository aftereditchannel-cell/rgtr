/**
 * NEXUS HQ — اپلیکیشن دسکتاپ واقعی ویندوز
 * ==========================================
 * پنجره‌ی Native ویندوز (Win32) + موتور WebView2 (موتور کرومِ تعبیه‌شده در ویندوز).
 * بدون مرورگر · بدون سرور · بدون localhost · بدون نیاز به نصب هیچ پیش‌نیازی
 * (فقط WebView2 Runtime که به‌صورت پیش‌فرض روی ویندوز ۱۰/۱۱ هست).
 *
 * کل وب‌اپ + WebView2Loader.dll داخل همین EXE تعبیه شده‌اند؛ در اولین اجرا به
 * %LOCALAPPDATA%\NEXUS-HQ استخراج می‌شوند و با «میزبان مجازی» سرو می‌شوند:
 *   https://app.nexushq.mobile  →  پوشه‌ی وب روی دیسک (بدون هیچ سوکت شبکه‌ای)
 */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <shlobj.h>
#include <stdio.h>
#include <string.h>

/* فقط برای تعریف اینترفیس‌های COM — تابع ورودی از لودر به‌صورت پویا گرفته می‌شود */
#include "WebView2.h"
#include "assets.hpp"

/* ------------------------------------------------------------ تنظیمات */

#define APP_TITLE_W L"NEXUS HQ"
#define VIRTUAL_HOST L"app.nexushq.mobile"
#define APP_URL L"https://" VIRTUAL_HOST L"/index.html"
#define WIN_CLASS L"NEXUSHQ_Window"
#define WIN_MIN_W 940
#define WIN_MIN_H 600
#define DARK_BG RGB(0x08, 0x09, 0x0c)

/* ------------------------------------------------------------ مسیرها */

static wchar_t g_runtime_dir[MAX_PATH];  // %LOCALAPPDATA%\NEXUS-HQ
static wchar_t g_web_dir[MAX_PATH];      // ...\web\<version>
static wchar_t g_loader_path[MAX_PATH];  // ...\WebView2Loader.dll
static wchar_t g_userdata[MAX_PATH];     // ...\userdata

static bool guid_eq(REFGUID a, REFGUID b) {
  return a.Data1 == b.Data1 && a.Data2 == b.Data2 && a.Data3 == b.Data3 &&
         a.Data4[0] == b.Data4[0] && a.Data4[1] == b.Data4[1] && a.Data4[2] == b.Data4[2] &&
         a.Data4[3] == b.Data4[3] && a.Data4[4] == b.Data4[4] && a.Data4[5] == b.Data4[5] &&
         a.Data4[6] == b.Data4[6] && a.Data4[7] == b.Data4[7];
}

static void die_msg(const wchar_t* msg) {
  MessageBoxW(NULL, msg, APP_TITLE_W, MB_ICONERROR);
  ExitProcess(1);
}

static BOOL path_exists(const wchar_t* p) {
  return GetFileAttributesW(p) != INVALID_FILE_ATTRIBUTES;
}

static void ensure_dir_tree(const wchar_t* p) {
  if (path_exists(p)) return;
  wchar_t tmp[MAX_PATH];
  wcsncpy(tmp, p, MAX_PATH - 1);
  tmp[MAX_PATH - 1] = 0;
  for (wchar_t* c = tmp + 3; *c; c++) {  // بعد از «C:\»
    if (*c == L'\\') {
      *c = 0;
      CreateDirectoryW(tmp, NULL);
      *c = L'\\';
    }
  }
  CreateDirectoryW(tmp, NULL);
}

static void write_file(const wchar_t* path, const void* data, size_t size) {
  HANDLE f = CreateFileW(path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
  if (f == INVALID_HANDLE_VALUE) return;
  DWORD wr = 0;
  WriteFile(f, data, (DWORD)size, &wr, NULL);
  CloseHandle(f);
}

/* استخراج فایل‌های تعبیه‌شده — فقط یک بار برای هر نسخه */
static void extract_runtime() {
  if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, g_runtime_dir))) {
    wcscat(g_runtime_dir, L"\\NEXUS-HQ");
  } else {
    GetTempPathW(MAX_PATH, g_runtime_dir);
    wcscat(g_runtime_dir, L"NEXUS-HQ");
  }
  ensure_dir_tree(g_runtime_dir);

  wchar_t ver[32];
  MultiByteToWideChar(CP_UTF8, 0, EMBEDDED_VERSION, -1, ver, 32);

  swprintf(g_loader_path, MAX_PATH, L"%s\\WebView2Loader.dll", g_runtime_dir);
  swprintf(g_web_dir, MAX_PATH, L"%s\\web\\%s", g_runtime_dir, ver);
  swprintf(g_userdata, MAX_PATH, L"%s\\userdata", g_runtime_dir);

  wchar_t okp[MAX_PATH];
  swprintf(okp, MAX_PATH, L"%s\\.version-ok", g_web_dir);
  if (path_exists(okp) && path_exists(g_loader_path)) return;  // همین نسخه قبلاً استخراج شده

  ensure_dir_tree(g_web_dir);
  ensure_dir_tree(g_userdata);

  write_file(g_loader_path, EMBEDDED_LOADER, EMBEDDED_LOADER_SIZE);
  for (size_t i = 0; i < EMBEDDED_FILES_COUNT; i++) {
    const EmbeddedFile* ef = &EMBEDDED_FILES[i];
    wchar_t full[MAX_PATH];
    wchar_t rel[MAX_PATH];
    MultiByteToWideChar(CP_UTF8, 0, ef->path, -1, rel, MAX_PATH);
    swprintf(full, MAX_PATH, L"%s\\%s", g_web_dir, rel);
    wchar_t tmp[MAX_PATH];
    wcsncpy(tmp, full, MAX_PATH - 1);
    tmp[MAX_PATH - 1] = 0;
    for (wchar_t* c = tmp + 3; *c; c++) {
      if (*c == L'\\') { *c = 0; CreateDirectoryW(tmp, NULL); *c = L'\\'; }
    }
    write_file(full, ef->data, ef->size);
  }
  write_file(okp, EMBEDDED_VERSION, strlen(EMBEDDED_VERSION));
}

/* ------------------------------------------------------------ WebView2 */
/* GUIDهای اینترفیس‌ها — مستقیم از WebView2.h (MIDL_INTERFACE) */
static const GUID IID_WV2_EnvHandler = {0x4e8a3389, 0xc9d8, 0x4bd2, {0xb6, 0xb5, 0x12, 0x4f, 0xee, 0x6c, 0xc1, 0x4d}};
static const GUID IID_WV2_CtrlHandler = {0x6c4819f3, 0xc9b7, 0x4260, {0x81, 0x27, 0xc9, 0xf5, 0xbd, 0xe7, 0xf6, 0x8c}};
static const GUID IID_WV2_WebView2_3 = {0xa0d6df20, 0x3b92, 0x416d, {0xaa, 0x0c, 0x43, 0x7a, 0x9c, 0x72, 0x78, 0x57}};
static const GUID IID_WV2_Settings3 = {0xfdb5ab74, 0xaf33, 0x4854, {0x84, 0xf0, 0x0a, 0x63, 0x1d, 0xeb, 0x5e, 0xba}};


typedef HRESULT(STDMETHODCALLTYPE* FnCreateEnvWithOptions)(
    PCWSTR browserExecutableFolder, PCWSTR userDataFolder,
    ICoreWebView2EnvironmentOptions* options,
    ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler* handler);

static FnCreateEnvWithOptions g_create_env = NULL;
static ICoreWebView2Environment* g_env = NULL;
static ICoreWebView2Controller* g_ctrl = NULL;
static ICoreWebView2* g_web = NULL;
static HWND g_hwnd = NULL;

class EnvHandler : public ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler {
 public:
  ULONG STDMETHODCALLTYPE AddRef() override { return 1; }
  ULONG STDMETHODCALLTYPE Release() override { return 1; }
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
    if (riid == IID_IUnknown ||
        guid_eq(riid, IID_WV2_EnvHandler)) {
      *ppv = static_cast<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*>(this);
      return S_OK;
    }
    *ppv = NULL;
    return E_NOINTERFACE;
  }
  HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Environment* createdEnvironment) override;
};

class CtrlHandler : public ICoreWebView2CreateCoreWebView2ControllerCompletedHandler {
 public:
  ULONG STDMETHODCALLTYPE AddRef() override { return 1; }
  ULONG STDMETHODCALLTYPE Release() override { return 1; }
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
    if (riid == IID_IUnknown ||
        guid_eq(riid, IID_WV2_CtrlHandler)) {
      *ppv = static_cast<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler*>(this);
      return S_OK;
    }
    *ppv = NULL;
    return E_NOINTERFACE;
  }
  HRESULT STDMETHODCALLTYPE Invoke(HRESULT errorCode, ICoreWebView2Controller* createdController) override;
};

static EnvHandler g_env_handler;
static CtrlHandler g_ctrl_handler;

static void resize_webview() {
  if (!g_ctrl || !g_hwnd) return;
  RECT r;
  GetClientRect(g_hwnd, &r);
  g_ctrl->put_Bounds(r);
}

HRESULT EnvHandler::Invoke(HRESULT hr, ICoreWebView2Environment* env) {
  if (FAILED(hr) || !env) {
    if (hr == HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND)) {
      die_msg(L"«Microsoft Edge WebView2 Runtime» روی این سیستم نصب نیست.\n"
              L"لطفاً آن را از سایت مایکروسافت نصب کنید و دوباره اجرا کنید.\n"
              L"(روی ویندوز ۱۰/۱۱ به‌صورت پیش‌فرض نصب است)");
    }
    die_msg(L"راه‌اندازی WebView2 با خطا مواجه شد.");
  }
  g_env = env;
  g_env->AddRef();
  return g_env->CreateCoreWebView2Controller(g_hwnd, &g_ctrl_handler);
}

HRESULT CtrlHandler::Invoke(HRESULT hr, ICoreWebView2Controller* ctrl) {
  if (FAILED(hr) || !ctrl) die_msg(L"ساخت کنترلر WebView2 با خطا مواجه شد.");
  g_ctrl = ctrl;
  g_ctrl->AddRef();

  g_ctrl->get_CoreWebView2(&g_web);
  if (!g_web) die_msg(L"CoreWebView2 در دسترس نیست.");

  ICoreWebView2Settings* settings = NULL;
  if (SUCCEEDED(g_web->get_Settings(&settings)) && settings) {
    settings->put_AreDevToolsEnabled(FALSE);
    settings->put_AreDefaultContextMenusEnabled(FALSE);
    settings->put_IsStatusBarEnabled(FALSE);
    // کلیدهای میان‌بر مرورگر (F12/Ctrl+...) خاموش — در ICoreWebView2Settings3
    ICoreWebView2Settings3* s3 = NULL;
    if (SUCCEEDED(settings->QueryInterface(IID_WV2_Settings3, (void**)&s3)) && s3) {
      s3->put_AreBrowserAcceleratorKeysEnabled(FALSE);
      s3->Release();
    }
    settings->Release();
  }

  // نگاشت پوشه‌ی وب به دامنه‌ی مجازی — هیچ سرور و سوکتی در کار نیست
  ICoreWebView2_3* wv3 = NULL;
  if (SUCCEEDED(g_web->QueryInterface(IID_WV2_WebView2_3, (void**)&wv3)) && wv3) {
    wv3->SetVirtualHostNameToFolderMapping(VIRTUAL_HOST, g_web_dir,
                                            COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW);
    wv3->Release();
  }

  resize_webview();
  g_web->Navigate(APP_URL);
  return S_OK;
}

/* ------------------------------------------------------------ پنجره */

static LRESULT CALLBACK WndProc(HWND h, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
    case WM_SIZE:
      resize_webview();
      return 0;
    case WM_GETMINMAXINFO: {
      MINMAXINFO* mmi = (MINMAXINFO*)l;
      mmi->ptMinTrackSize.x = WIN_MIN_W;
      mmi->ptMinTrackSize.y = WIN_MIN_H;
      return 0;
    }
    case WM_ERASEBKGND:
      return 1;
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProcW(h, m, w, l);
}

static void load_window_icon(HWND hwnd) {
  wchar_t exe_dir[MAX_PATH];
  GetModuleFileNameW(NULL, exe_dir, MAX_PATH);
  wchar_t* slash = wcsrchr(exe_dir, L'\\');
  if (slash) *slash = 0;
  wchar_t ico[MAX_PATH];
  swprintf(ico, MAX_PATH, L"%s\\icon.ico", exe_dir);
  HANDLE big = LoadImageW(NULL, ico, IMAGE_ICON, GetSystemMetrics(SM_CXICON),
                          GetSystemMetrics(SM_CYICON), LR_LOADFROMFILE);
  HANDLE small = LoadImageW(NULL, ico, IMAGE_ICON, GetSystemMetrics(SM_CXSMICON),
                            GetSystemMetrics(SM_CYSMICON), LR_LOADFROMFILE);
  if (big) SendMessageW(hwnd, WM_SETICON, ICON_BIG, (LPARAM)big);
  if (small) SendMessageW(hwnd, WM_SETICON, ICON_SMALL, (LPARAM)small);
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
  (void)prev;
  (void)cmd;

  extract_runtime();

  // بارگذاری پویای لودر WebView2 (اول از پوشه‌ی ران‌تایم، بعد کنار EXE)
  HMODULE loader = LoadLibraryW(g_loader_path);
  if (!loader) {
    wchar_t alt[MAX_PATH];
    GetModuleFileNameW(NULL, alt, MAX_PATH);
    wchar_t* s = wcsrchr(alt, L'\\');
    if (s) {
      *s = 0;
      wchar_t beside[MAX_PATH];
      swprintf(beside, MAX_PATH, L"%s\\WebView2Loader.dll", alt);
      loader = LoadLibraryW(beside);
    }
  }
  if (!loader) die_msg(L"بارگذاری WebView2Loader.dll ممکن نشد.");
  g_create_env = (FnCreateEnvWithOptions)GetProcAddress(loader, "CreateCoreWebView2EnvironmentWithOptions");
  if (!g_create_env) die_msg(L"نقطه‌ی ورودی WebView2 یافت نشد.");

  WNDCLASSW wc = {0};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = inst;
  wc.hCursor = LoadCursorW(NULL, IDC_ARROW);
  wc.hbrBackground = CreateSolidBrush(DARK_BG);
  wc.lpszClassName = WIN_CLASS;
  RegisterClassW(&wc);

  int sw = GetSystemMetrics(SM_CXSCREEN);
  int sh = GetSystemMetrics(SM_CYSCREEN);
  int w = sw * 82 / 100, h = sh * 84 / 100;
  if (w < WIN_MIN_W) w = WIN_MIN_W;
  if (h < WIN_MIN_H) h = WIN_MIN_H;

  g_hwnd = CreateWindowExW(0, WIN_CLASS, APP_TITLE_W, WS_OVERLAPPEDWINDOW,
                           (sw - w) / 2, (sh - h) / 2, w, h, NULL, NULL, inst, NULL);
  if (!g_hwnd) die_msg(L"ساخت پنجره با خطا مواجه شد.");

  // نوار عنوان تیره هم‌رنگ برنامه
  HMODULE dwm = LoadLibraryW(L"dwmapi.dll");
  if (dwm) {
    typedef HRESULT(WINAPI* DwmSetWindowAttribute_t)(HWND, DWORD, LPCVOID, DWORD);
    auto fn = (DwmSetWindowAttribute_t)GetProcAddress(dwm, "DwmSetWindowAttribute");
    if (fn) {
      BOOL dark = TRUE;
      fn(g_hwnd, 20, &dark, sizeof(dark));  // DWMWA_USE_IMMERSIVE_DARK_MODE (وین10)
      fn(g_hwnd, 38, &dark, sizeof(dark));  // همان در ویندوز 11
      COLORREF cap = DARK_BG;
      fn(g_hwnd, 35, &cap, sizeof(cap));    // DWMWA_CAPTION_COLOR
    }
  }

  load_window_icon(g_hwnd);
  ShowWindow(g_hwnd, show);
  UpdateWindow(g_hwnd);

  // userDataFolder مشخص → داده‌های برنامه (IndexedDB) پایدار می‌ماند
  HRESULT hr = g_create_env(NULL, g_userdata, NULL, &g_env_handler);
  if (FAILED(hr)) {
    die_msg(L"ساخت محیط WebView2 با خطا مواجه شد.\n"
            L"اگر «Microsoft Edge WebView2 Runtime» نصب نیست، از سایت مایکروسافت نصب کنید.");
  }

  MSG msg;
  while (GetMessageW(&msg, NULL, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }

  if (g_ctrl) g_ctrl->Release();
  if (g_env) g_env->Release();
  return (int)msg.wParam;
}
