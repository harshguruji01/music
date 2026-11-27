#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <wchar.h>

static int file_exists(const wchar_t *path) {
    DWORD attr = GetFileAttributesW(path);
    return (attr != INVALID_FILE_ATTRIBUTES && !(attr & FILE_ATTRIBUTE_DIRECTORY));
}

static int try_launch_browser(const wchar_t *exe_path, const wchar_t *profile_dir) {
    if (!file_exists(exe_path)) return 0;

    wchar_t cmd[2048];
    _snwprintf_s(
        cmd,
        2048,
        _TRUNCATE,
        L"\"%s\" --app=https://music.webguruji.online/ --user-data-dir=\"%s\" --class=GuruMusic --no-first-run",
        exe_path,
        profile_dir
    );

    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    ZeroMemory(&pi, sizeof(pi));

    if (CreateProcessW(NULL, cmd, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return 1;
    }
    return 0;
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    (void)hInstance;
    (void)hPrevInstance;
    (void)pCmdLine;
    (void)nCmdShow;

    wchar_t local_app_data[MAX_PATH] = {0};
    wchar_t profile_dir[MAX_PATH] = {0};
    if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, local_app_data))) {
        _snwprintf_s(profile_dir, MAX_PATH, _TRUNCATE, L"%s\\GuruMusic\\Profile", local_app_data);
    } else {
        wcscpy_s(profile_dir, MAX_PATH, L"GuruMusicProfile");
    }

    const wchar_t *candidates[] = {
        L"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        L"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        L"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        L"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        L"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
    };

    for (size_t i = 0; i < sizeof(candidates) / sizeof(candidates[0]); ++i) {
        if (try_launch_browser(candidates[i], profile_dir)) {
            return 0;
        }
    }

    // Check per-user Chrome/Brave in %LOCALAPPDATA%
    if (local_app_data[0] != L'\0') {
        wchar_t user_chrome[MAX_PATH];
        _snwprintf_s(user_chrome, MAX_PATH, _TRUNCATE, L"%s\\Google\\Chrome\\Application\\chrome.exe", local_app_data);
        if (try_launch_browser(user_chrome, profile_dir)) return 0;

        wchar_t user_edge[MAX_PATH];
        _snwprintf_s(user_edge, MAX_PATH, _TRUNCATE, L"%s\\Microsoft\\Edge\\Application\\msedge.exe", local_app_data);
        if (try_launch_browser(user_edge, profile_dir)) return 0;
    }

    // Fallback to default browser
    ShellExecuteW(NULL, L"open", L"https://music.webguruji.online/", NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
