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
#include <windows.h>
#include <winhttp.h>
#include <wincrypt.h>
#include <map>
#include <string>
#include <vector>

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
static const GUID IID_WV2_ProxyHandler = {0x7dd8bcb9, 0x0f95, 0x4b73, {0xb3, 0x03, 0x45, 0x4f, 0x6a, 0x11, 0x22, 0x33}};
static const GUID IID_WV2_MsgHandler = {0xab3c1b11, 0x9b52, 0x41a7, {0x8f, 0x16, 0x9d, 0x2c, 0x0a, 0x51, 0x1b, 0x92}};


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

/* تعریف‌ها در بخش «پل بومی» پایین‌تر آمده‌اند */
static void attach_bridge(ICoreWebView2* web);

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

  // پل بومی: پروکسی شبکه + پیام‌ها (کلیدها/عنوان)
  attach_bridge(g_web);

  resize_webview();
  g_web->Navigate(APP_URL);
  return S_OK;
}


/* ------------------------------------------------------------ پل بومی */

#include <string>
#include <map>
typedef std::wstring W;
typedef std::map<std::wstring, std::wstring> WMap;

/* ---------- مخزن امن کلید (DPAPI) ---------- */
static WMap g_keys;
static wchar_t g_keys_path[MAX_PATH];

static std::string b64enc(const BYTE* d, DWORD n) {
  static const char* T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string o; o.reserve(((n + 2) / 3) * 4);
  for (DWORD i = 0; i < n; i += 3) {
    DWORD v = d[i] << 16;
    if (i + 1 < n) v |= d[i + 1] << 8;
    if (i + 2 < n) v |= d[i + 2];
    o += T[(v >> 18) & 63]; o += T[(v >> 12) & 63];
    o += (i + 1 < n) ? T[(v >> 6) & 63] : '=';
    o += (i + 2 < n) ? T[v & 63] : '=';
  }
  return o;
}

static void keys_load() {
  swprintf(g_keys_path, MAX_PATH, L"%s\\keys.bin", g_runtime_dir);
  HANDLE f = CreateFileW(g_keys_path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
  if (f == INVALID_HANDLE_VALUE) return;
  char buf[1 << 16];
  DWORD rd = 0; std::string all;
  while (ReadFile(f, buf, sizeof(buf), &rd, NULL) && rd) all.append(buf, rd);
  CloseHandle(f);
  // هر خط: name=base64(dpapi)
  size_t pos = 0;
  while (pos < all.size()) {
    size_t eol = all.find('\n', pos);
    if (eol == std::string::npos) eol = all.size();
    std::string line = all.substr(pos, eol - pos);
    pos = eol + 1;
    size_t eq = line.find('=');
    if (eq == std::string::npos) continue;
    std::string name = line.substr(0, eq);
    std::string val = line.substr(eq + 1);
    // decode base64 → CryptUnprotectData
    std::vector<BYTE> raw;
    static const char* T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    int q[4], n = 0;
    for (char c : val) {
      const char* p = strchr(T, c);
      if (!p || c == '=') { if (c == '=' && n >= 2) { q[n++] = 0; if (n == 4) { raw.push_back((q[0] << 2) | (q[1] >> 4)); if (q[2] || q[3]) raw.push_back((q[1] << 4) | (q[2] >> 2)); if (q[3]) raw.push_back((q[2] << 6) | q[3]); n = 0; } } continue; }
      if (n < 4) q[n++] = (int)(p - T);
      if (n == 4) { raw.push_back((q[0] << 2) | (q[1] >> 4)); raw.push_back((q[1] << 4) | (q[2] >> 2)); raw.push_back((q[2] << 6) | q[3]); n = 0; }
    }
    DATA_BLOB in{}, out{};
    in.pbData = raw.data(); in.cbData = (DWORD)raw.size();
    if (CryptUnprotectData(&in, NULL, NULL, NULL, NULL, 0, &out)) {
      std::string plain((char*)out.pbData, out.cbData);
      LocalFree(out.pbData);
      int wl = MultiByteToWideChar(CP_UTF8, 0, name.c_str(), -1, NULL, 0);
      std::wstring wn(wl, 0); MultiByteToWideChar(CP_UTF8, 0, name.c_str(), -1, &wn[0], wl);
      g_keys[wn] = std::wstring(plain.begin(), plain.end());
    }
  }
}

static void keys_save() {
  std::string all;
  for (auto& kv : g_keys) {
    int nl = WideCharToMultiByte(CP_UTF8, 0, kv.first.c_str(), -1, NULL, 0, NULL, NULL);
    std::string name(nl, 0); WideCharToMultiByte(CP_UTF8, 0, kv.first.c_str(), -1, &name[0], nl, NULL, NULL);
    if (!name.empty() && name.back() == 0) name.pop_back();
    DATA_BLOB in{}, out{};
    std::string v((const char*)kv.second.c_str(), kv.second.size() * sizeof(wchar_t));
    in.pbData = (BYTE*)v.data(); in.cbData = (DWORD)v.size();
    if (CryptProtectData(&in, L"NEXUS HQ keys", NULL, NULL, NULL, 0, &out)) {
      all += name + "=" + b64enc(out.pbData, out.cbData) + "\n";
      LocalFree(out.pbData);
    }
  }
  HANDLE f = CreateFileW(g_keys_path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, 0, NULL);
  if (f != INVALID_HANDLE_VALUE) { DWORD w2; WriteFile(f, all.data(), (DWORD)all.size(), &w2, NULL); CloseHandle(f); }
}

/* ---------- پروکسی WinHTTP ---------- */
struct HttpReply { int status = 0; std::string body; std::string ctype; };

static std::wstring url_decode(const std::wstring& s) {
  std::wstring o; char tmp[3] = {0, 0, 0};
  for (size_t i = 0; i < s.size(); i++) {
    if (s[i] == L'%' && i + 2 < s.size()) {
      tmp[0] = (char)s[i + 1]; tmp[1] = (char)s[i + 2];
      wchar_t wc = (wchar_t)strtol(tmp, NULL, 16);
      if (wc) o += wc; else o += L' ';
      i += 2;
    } else if (s[i] == L'+') o += L' ';
    else o += s[i];
  }
  return o;
}

static HttpReply http_native(const std::wstring& url, const std::wstring& method,
                             const std::string& body, const std::vector<std::wstring>& headers) {
  HttpReply r;
  URL_COMPONENTS uc{}; uc.dwStructSize = sizeof(uc);
  wchar_t host[256] = {0}, path[8192] = {0};
  uc.lpszHostName = host; uc.dwHostNameLength = 255;
  uc.lpszUrlPath = path; uc.dwUrlPathLength = 8191;
  uc.dwSchemeLength = (DWORD)-1;
  if (!WinHttpCrackUrl(url.c_str(), 0, 0, &uc) || (uc.nScheme != INTERNET_SCHEME_HTTP && uc.nScheme != INTERNET_SCHEME_HTTPS)) {
    r.status = 400; r.body = "{\"error\":\"invalid url\"}"; return r;
  }
  HINTERNET sess = WinHttpOpen(L"NEXUS-HQ/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
  if (!sess) { r.status = 502; return r; }
  HINTERNET conn = WinHttpConnect(sess, host, uc.nPort, 0);
  HINTERNET req = conn ? WinHttpOpenRequest(conn, method.empty() ? L"GET" : method.c_str(), path,
                                            NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES,
                                            uc.nPort == 443 ? WINHTTP_FLAG_SECURE : 0) : NULL;
  if (!req) { if (conn) WinHttpCloseHandle(conn); WinHttpCloseHandle(sess); r.status = 502; return r; }
  for (auto& h : headers) if (!h.empty()) WinHttpAddRequestHeaders(req, h.c_str(), (ULONG)-1, WINHTTP_ADDREQ_FLAG_ADD);
  BOOL sent = WinHttpSendRequest(req, WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                                 body.empty() ? NULL : (LPVOID)body.data(),
                                 body.empty() ? 0 : (DWORD)body.size(),
                                 body.empty() ? 0 : (DWORD)body.size(), 0);
  if (sent && WinHttpReceiveResponse(req, NULL)) {
    DWORD st = 0, sz = sizeof(st);
    WinHttpQueryHeaders(req, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_NO_HEADER_INDEX, &st, &sz, 0);
    r.status = (int)st;
    wchar_t ct[128] = {0}; DWORD cs = 126;
    if (WinHttpQueryHeaders(req, WINHTTP_QUERY_CONTENT_TYPE, WINHTTP_NO_HEADER_INDEX, ct, &cs, 0)) {
      char cta[128]; WideCharToMultiByte(CP_UTF8, 0, ct, -1, cta, 128, NULL, NULL);
      for (char* p = cta; *p; p++) if (*p == ';') { *p = 0; break; }
      r.ctype = cta;
    }
    for (;;) {
      DWORD avail = 0;
      if (!WinHttpQueryDataAvailable(req, &avail) || !avail) break;
      std::string chunk(avail, 0);
      DWORD read2 = 0;
      if (!WinHttpReadData(req, &chunk[0], avail, &read2) || !read2) break;
      r.body.append(chunk, 0, read2);
      if (r.body.size() > (8u << 20)) break;  // سقف ۸MB
    }
  } else {
    r.status = 502;
  }
  WinHttpCloseHandle(req); if (conn) WinHttpCloseHandle(conn); WinHttpCloseHandle(sess);
  return r;
}

/* ---------- handler رخداد WebResourceRequested (پروکسی) ---------- */
class ProxyHandler : public ICoreWebView2WebResourceRequestedEventHandler {
 public:
  ULONG STDMETHODCALLTYPE AddRef() override { return 1; }
  ULONG STDMETHODCALLTYPE Release() override { return 1; }
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
    if (riid == IID_IUnknown || riid == IID_WV2_ProxyHandler) {
      *ppv = static_cast<ICoreWebView2WebResourceRequestedEventHandler*>(this);
      return S_OK;
    }
    *ppv = NULL; return E_NOINTERFACE;
  }
  HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* sender, ICoreWebView2WebResourceRequestedEventArgs* args) override;
};
static ProxyHandler g_proxy_handler;

/* ---------- handler پیام‌های وب (کلیدها + عنوان) ---------- */
class MsgHandler : public ICoreWebView2WebMessageReceivedEventHandler {
 public:
  ULONG STDMETHODCALLTYPE AddRef() override { return 1; }
  ULONG STDMETHODCALLTYPE Release() override { return 1; }
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override {
    if (riid == IID_IUnknown || riid == IID_WV2_MsgHandler) {
      *ppv = static_cast<ICoreWebView2WebMessageReceivedEventHandler*>(this);
      return S_OK;
    }
    *ppv = NULL; return E_NOINTERFACE;
  }
  HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) override;
};
static MsgHandler g_msg_handler;

/* ---------- استخراج پارامتر query ---------- */
static std::wstring get_param(const std::wstring& q, const wchar_t* key) {
  std::wstring k = key; k += L'=';
  size_t p = q.find(k);
  if (p == std::wstring::npos) return L"";
  p += k.size();
  size_t e = q.find(L'&', p);
  return url_decode(q.substr(p, e == std::wstring::npos ? std::wstring::npos : e - p));
}

HRESULT ProxyHandler::Invoke(ICoreWebView2* sender, ICoreWebView2WebResourceRequestedEventArgs* args) {
  ICoreWebView2WebResourceRequest* req = NULL;
  if (FAILED(args->get_Request(&req)) || !req) return S_OK;
  LPWSTR uri = NULL;
  req->get_Uri(&uri);
  if (!uri) { if (req) req->Release(); return S_OK; }
  std::wstring url(uri); CoTaskMemFree(uri);
  // فقط درخواست‌های /proxy؟url=
  size_t qm = url.find(L'?');
  std::wstring q = qm == std::wstring::npos ? L"" : url.substr(qm + 1);
  std::wstring target = get_param(q, L"url");
  ICoreWebView2Environment* env = g_env;
  req->Release();
  if (target.rfind(L"http", 0) != 0 || target.find(L"://") == std::wstring::npos) {
    env = NULL;
  }
  if (!env) return S_OK;

  std::wstring method = get_param(q, L"method");
  if (method.empty()) method = L"GET";
  std::wstring bodyW = get_param(q, L"body");
  std::string body(bodyW.begin(), bodyW.end());
  // هدرها: h=K1:V1~~K2:V2
  std::vector<std::wstring> headers;
  std::wstring hraw = get_param(q, L"h");
  if (!hraw.empty()) {
    size_t pos = 0;
    while (pos < hraw.size()) {
      size_t e = hraw.find(L"~~", pos);
      std::wstring one = hraw.substr(pos, e == std::wstring::npos ? std::wstring::npos : e - pos);
      pos = (e == std::wstring::npos) ? hraw.size() : e + 2;
      if (one.find(L':') != std::wstring::npos) headers.push_back(one);
    }
  }

  HttpReply rep = http_native(target, method, body, headers);

  // پاسخ: stream + هدر CORS
  HGLOBAL gm = GlobalAlloc(GMEM_MOVEABLE, rep.body.empty() ? 1 : rep.body.size());
  if (gm) {
    void* dst = GlobalLock(gm);
    if (!rep.body.empty()) memcpy(dst, rep.body.data(), rep.body.size());
    GlobalUnlock(gm);
    IStream* st = NULL;
    if (SUCCEEDED(CreateStreamOnHGlobal(gm, TRUE, &st)) && st) {
      wchar_t reason[16];
      swprintf(reason, 16, L"%d", rep.status);
      wchar_t hdrs[512];
      swprintf(hdrs, 512,
               L"Access-Control-Allow-Origin: *\r\nContent-Type: %hs",
               (rep.ctype.empty() ? "application/octet-stream" : rep.ctype.c_str()));
      ICoreWebView2WebResourceResponse* resp = NULL;
      if (SUCCEEDED(env->CreateWebResourceResponse(st, rep.status, reason, hdrs, &resp)) && resp) {
        args->put_Response(resp);
        resp->Release();
      }
      st->Release();
    }
  }
  return S_OK;
}

HRESULT MsgHandler::Invoke(ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) {
  LPWSTR msg = NULL;
  HRESULT hr2 = args->TryGetWebMessageAsString(&msg);
  if (FAILED(hr2) || !msg) return S_OK;
  std::wstring m(msg); CoTaskMemFree(msg);
  // فرمت ساده: set|name|value ، del|name ، title|text
  size_t b1 = m.find(L'|');
  if (b1 == std::wstring::npos) return S_OK;
  std::wstring cmd = m.substr(0, b1), rest = m.substr(b1 + 1);
  if (cmd == L"title") {
    SetWindowTextW(g_hwnd, rest.c_str());
  } else if (cmd == L"set") {
    size_t b2 = rest.find(L'|');
    if (b2 != std::wstring::npos) {
      g_keys[rest.substr(0, b2)] = rest.substr(b2 + 1);
      keys_save();
    }
  } else if (cmd == L"del") {
    g_keys.erase(rest);
    keys_save();
  }
  return S_OK;
}

/* تزریق اسکریپت پل در آغاز هر سند — NexusKeyStore همگام + NexusNative */
static void inject_bridge(ICoreWebView2* web) {
  std::wstring keys = L"{";
  bool first = true;
  for (auto& kv : g_keys) {
    if (!first) keys += L",";
    first = false;
    keys += L"\"";
    for (wchar_t c : kv.first) if (c != '"' && c != '\\') keys += c;
    keys += L"\":\"";
    for (wchar_t c : kv.second) {
      if (c == '"' || c == '\\') keys += L'\\';
      keys += c;
    }
    keys += L"\"";
  }
  keys += L"}";
  std::wstring js =
      L"window.NexusKeyStore={get:function(n){var v=window.__NXK&&window.__NXK[n];return v==null?null:v},"
      L"set:function(n,v){window.__NXK=window.__NXK||{};window.__NXK[n]=v;"
      L"chrome.webview.postMessage('set|'+n+'|'+v)},"
      L"delete:function(n){if(window.__NXK)delete window.__NXK[n];chrome.webview.postMessage('del|'+n)}};"
      L"window.__NXK=" + keys + L";"
      L"window.NexusNative={setTitle:function(t){chrome.webview.postMessage('title|'+t)}};";
  web->AddScriptToExecuteOnDocumentCreated(js.c_str(), NULL);
}

#include "EventToken.h"
static EventRegistrationToken g_tok1, g_tok2;
static void attach_bridge(ICoreWebView2* web) {
  web->AddWebResourceRequestedFilter(L"https://api.nexushq.mobile/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
  web->add_WebResourceRequested(&g_proxy_handler, &g_tok1);
  web->add_WebMessageReceived(&g_msg_handler, &g_tok2);
  inject_bridge(web);
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
  keys_load();

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
