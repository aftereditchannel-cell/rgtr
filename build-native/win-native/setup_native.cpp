/**
 * NEXUS HQ — نصب‌کننده‌ی Native ویندوز (بدون هیچ وابستگی)
 * =========================================================
 * کپی به %LOCALAPPDATA%\NEXUS HQ · شورتکات دسکتاپ و منوی استارت ·
 * ثبت در Add/Remove Programs · حذف کامل با unins000.exe
 *
 * Build (Zig):
 *   zig c++ -target x86_64-windows-gnu -O2 -municode setup.cpp payload.cpp \
 *       -o NEXUS-HQ-Setup.exe -lole32 -lshell32 -ladvapi32 -luser32
 */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <shlobj.h>
#include <shlwapi.h>
#include <objbase.h>
#include <stdio.h>

#include "payload_native.hpp"

#define APP_NAME_W L"NEXUS HQ Native"
#define APP_VERSION_W L"1.0.0"
#define APP_EXE_W L"NEXUS-HQ-Native.exe"
#define UNINS_W L"unins000.exe"
#define REG_UNINST L"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\NEXUS HQ Native"

static wchar_t g_dir[MAX_PATH];
static wchar_t g_self[MAX_PATH];

static void ensure_dir_tree(const wchar_t* p) {
  wchar_t tmp[MAX_PATH];
  wcsncpy(tmp, p, MAX_PATH - 1);
  tmp[MAX_PATH - 1] = 0;
  for (wchar_t* c = tmp + 3; *c; c++) {
    if (*c == L'\\') { *c = 0; CreateDirectoryW(tmp, NULL); *c = L'\\'; }
  }
  CreateDirectoryW(tmp, NULL);
}

/* ساخت شورتکات .lnk با COM — مسیر + آیکون + پوشه‌ی کاری */
static bool make_shortcut(const wchar_t* lnk_path, const wchar_t* target, const wchar_t* workdir,
                          const wchar_t* icon) {
  bool ok = false;
  IShellLinkW* sl = NULL;
  IPersistFile* pf = NULL;
  if (SUCCEEDED(CoCreateInstance(CLSID_ShellLink, NULL, CLSCTX_INPROC_SERVER,
                                 IID_IShellLinkW, (void**)&sl)) &&
      sl) {
    sl->SetPath(target);
    sl->SetDescription(APP_NAME_W);
    sl->SetWorkingDirectory(workdir);
    if (icon) sl->SetIconLocation(icon, 0);
    if (SUCCEEDED(sl->QueryInterface(IID_IPersistFile, (void**)&pf)) && pf) {
      if (SUCCEEDED(pf->Save(lnk_path, TRUE))) ok = true;
      pf->Release();
    }
    sl->Release();
  }
  return ok;
}

static void reg_set(HKEY k, const wchar_t* name, const wchar_t* val) {
  RegSetValueExW(k, name, 0, REG_SZ, (const BYTE*)val, (DWORD)((wcslen(val) + 1) * sizeof(wchar_t)));
}
static void reg_set_dword(HKEY k, const wchar_t* name, DWORD v) {
  RegSetValueExW(k, name, 0, REG_DWORD, (const BYTE*)&v, sizeof(v));
}

/* ------------------------------------------------------------ نصب */

static int do_install() {
  MessageBoxW(NULL,
              L"NEXUS HQ v1.0.0\nنصب آغاز می‌شود.\n"
              L"نصب برای کاربر فعلی است — به Administrator نیازی نیست.",
              APP_NAME_W, MB_OK | MB_ICONINFORMATION);

  wchar_t local[MAX_PATH];
  if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, local))) {
    MessageBoxW(NULL, L"پوشه‌ی کاربر یافت نشد.", APP_NAME_W, MB_ICONERROR);
    return 1;
  }
  swprintf(g_dir, MAX_PATH, L"%s\\NEXUS HQ Native", local);
  ensure_dir_tree(g_dir);

  wchar_t app_path[MAX_PATH], ico_path[MAX_PATH], unins_path[MAX_PATH];
  swprintf(app_path, MAX_PATH, L"%s\\%s", g_dir, APP_EXE_W);
  swprintf(ico_path, MAX_PATH, L"%s\\icon.ico", g_dir);
  swprintf(unins_path, MAX_PATH, L"%s\\%s", g_dir, UNINS_W);

  // نوشتن فایل‌ها — اگر برنامه در حال اجراست بسته شود
  HANDLE f = CreateFileW(app_path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
  if (f == INVALID_HANDLE_VALUE) {
    MessageBoxW(NULL, L"نوشتن فایل برنامه ممکن نشد.\nاگر NEXUS HQ در حال اجراست، آن را ببندید و دوباره نصب کنید.",
                APP_NAME_W, MB_ICONERROR);
    return 1;
  }
  DWORD wr = 0;
  WriteFile(f, PAYLOAD[0].data, (DWORD)PAYLOAD[0].size, &wr, NULL);
  CloseHandle(f);

  f = CreateFileW(ico_path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
  if (f != INVALID_HANDLE_VALUE) {
    WriteFile(f, PAYLOAD[1].data, (DWORD)PAYLOAD[1].size, &wr, NULL);
    CloseHandle(f);
  }

  // خودِ نصب‌کننده به‌عنوان Uninstaller
  CopyFileW(g_self, unins_path, FALSE);

  // شورتکات‌ها
  CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
  wchar_t desktop[MAX_PATH], programs[MAX_PATH], start_dir[MAX_PATH];
  SHGetFolderPathW(NULL, CSIDL_DESKTOP, NULL, 0, desktop);
  SHGetFolderPathW(NULL, CSIDL_PROGRAMS, NULL, 0, programs);
  swprintf(start_dir, MAX_PATH, L"%s\\NEXUS HQ Native", programs);
  ensure_dir_tree(start_dir);

  wchar_t lnk1[MAX_PATH], lnk2[MAX_PATH], lnk3[MAX_PATH];
  swprintf(lnk1, MAX_PATH, L"%s\\NEXUS HQ.lnk", desktop);
  swprintf(lnk2, MAX_PATH, L"%s\\NEXUS HQ.lnk", start_dir);
  swprintf(lnk3, MAX_PATH, L"%s\\Uninstall NEXUS HQ.lnk", start_dir);
  make_shortcut(lnk1, app_path, g_dir, ico_path);
  make_shortcut(lnk2, app_path, g_dir, ico_path);
  make_shortcut(lnk3, unins_path, g_dir, ico_path);

  // ثبت در Add/Remove Programs
  HKEY k = NULL;
  if (RegCreateKeyExW(HKEY_CURRENT_USER, REG_UNINST, 0, NULL, 0, KEY_WRITE, NULL, &k, NULL) ==
      ERROR_SUCCESS) {
    reg_set(k, L"DisplayName", APP_NAME_W);
    reg_set(k, L"DisplayVersion", APP_VERSION_W);
    reg_set(k, L"Publisher", L"NEXUS HQ Native");
    reg_set(k, L"InstallLocation", g_dir);
    reg_set(k, L"DisplayIcon", ico_path);
    wchar_t us[MAX_PATH * 2];
    swprintf(us, MAX_PATH * 2, L"\"%s\"", unins_path);
    reg_set(k, L"UninstallString", us);
    reg_set_dword(k, L"NoModify", 1);
    reg_set_dword(k, L"NoRepair", 1);
    RegCloseKey(k);
  }

  int run = MessageBoxW(NULL,
                        L"نصب NEXUS HQ کامل شد ✔\n\nبرنامه اجرا شود؟",
                        APP_NAME_W, MB_YESNO | MB_ICONQUESTION | MB_DEFBUTTON1);
  if (run == IDYES) {
    ShellExecuteW(NULL, L"open", app_path, NULL, g_dir, SW_SHOWNORMAL);
  }
  return 0;
}

/* ------------------------------------------------------------ حذف */

static void delete_file_if(const wchar_t* p) { DeleteFileW(p); }

/* حذف بازگشتی پوشه */
static void delete_tree(const wchar_t* dir) {
  wchar_t pat[MAX_PATH];
  swprintf(pat, MAX_PATH, L"%s\\*", dir);
  WIN32_FIND_DATAW fd;
  HANDLE h = FindFirstFileW(pat, &fd);
  if (h == INVALID_HANDLE_VALUE) return;
  do {
    if (wcscmp(fd.cFileName, L".") == 0 || wcscmp(fd.cFileName, L"..") == 0) continue;
    wchar_t full[MAX_PATH];
    swprintf(full, MAX_PATH, L"%s\\%s", dir, fd.cFileName);
    if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)
      delete_tree(full);
    else
      DeleteFileW(full);
  } while (FindNextFileW(h, &fd));
  FindClose(h);
  RemoveDirectoryW(dir);
}

static int do_uninstall() {
  int ok = MessageBoxW(NULL,
                       L"NEXUS HQ حذف شود؟\n"
                       L"(داده‌های برنامه در مرورگر ذخیره نشده‌اند؛ فقط خود برنامه حذف می‌شود)",
                       APP_NAME_W, MB_YESNO | MB_ICONWARNING);
  if (ok != IDYES) return 0;

  RegDeleteTreeW(HKEY_CURRENT_USER, REG_UNINST);

  wchar_t desktop[MAX_PATH], programs[MAX_PATH];
  SHGetFolderPathW(NULL, CSIDL_DESKTOP, NULL, 0, desktop);
  SHGetFolderPathW(NULL, CSIDL_PROGRAMS, NULL, 0, programs);
  wchar_t lnk[MAX_PATH];
  swprintf(lnk, MAX_PATH, L"%s\\NEXUS HQ.lnk", desktop);
  delete_file_if(lnk);
  swprintf(lnk, MAX_PATH, L"%s\\NEXUS HQ Native", programs);
  delete_tree(lnk);  // پوشه‌ی منوی استارت

  // فایل‌های نصب + کش ران‌تایم
  wchar_t base[MAX_PATH], rt[MAX_PATH];
  if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base))) {
    swprintf(rt, MAX_PATH, L"%s\\NEXUS-HQ", base);
    delete_tree(rt);
  }
  // پوشه‌ی نصب — خود unins هم داخلش است؛ پس آخر و به‌صورت زمان‌بندی‌شده
  wchar_t cmd[MAX_PATH * 4];
  swprintf(cmd, MAX_PATH * 4,
           L"/c ping 127.0.0.1 -n 3 > nul & rmdir /s /q \"%s\"", g_dir);
  STARTUPINFOW si = {0};
  si.cb = sizeof(si);
  PROCESS_INFORMATION pi = {0};
  CreateProcessW(L"C:\\Windows\\System32\\cmd.exe", cmd, NULL, NULL, FALSE, CREATE_NO_WINDOW,
                 NULL, NULL, &si, &pi);
  if (pi.hProcess) CloseHandle(pi.hProcess);
  if (pi.hThread) CloseHandle(pi.hThread);

  MessageBoxW(NULL, L"NEXUS HQ حذف شد.", APP_NAME_W, MB_OK | MB_ICONINFORMATION);
  return 0;
}

/* ------------------------------------------------------------ شروع */

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
  (void)inst; (void)prev; (void)show;
  GetModuleFileNameW(NULL, g_self, MAX_PATH);

  for (const wchar_t* c = cmd; c && *c; c++) {
    if (wcsstr(c, L"--uninstall")) return do_uninstall();
  }
  // unins000.exe همیشه حالت حذف دارد (از منوی استارت یا ARP)
  const wchar_t* self_name = wcsrchr(g_self, L'\\');
  if (self_name && wcsicmp(self_name + 1, UNINS_W) == 0) return do_uninstall();

  return do_install();
}
