#define _POSIX_C_SOURCE 200809L
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

static int cmd_exists(const char *cmd) {
    char buf[512];
    snprintf(buf, sizeof(buf), "command -v %s >/dev/null 2>&1", cmd);
    return system(buf) == 0;
}

int main(void) {
    const char *home = getenv("HOME");
    char profile_arg[PATH_MAX];
    if (home && home[0]) {
        snprintf(profile_arg, sizeof(profile_arg), "--user-data-dir=%s/.local/share/GuruMusic", home);
    } else {
        snprintf(profile_arg, sizeof(profile_arg), "--user-data-dir=/tmp/GuruMusic");
    }

    const char *browsers[] = {
        "google-chrome",
        "chromium",
        "chromium-browser",
        "brave-browser",
        "microsoft-edge",
        "vivaldi-stable"
    };

    for (size_t i = 0; i < sizeof(browsers) / sizeof(browsers[0]); ++i) {
        if (cmd_exists(browsers[i])) {
            execlp(
                browsers[i],
                browsers[i],
                "--app=https://music.webguruji.online/",
                profile_arg,
                "--class=GuruMusic",
                "--no-first-run",
                (char *)NULL
            );
        }
    }

    execlp("xdg-open", "xdg-open", "https://music.webguruji.online/", (char *)NULL);
    return 1;
}
