sed -i '823a\
    if (normalized !== "midnight") {\
      const storageKey = `mnsuet_prev_light_theme_${targetId || "guest"}`;\
      if (typeof localStorage !== "undefined") {\
        localStorage.setItem(storageKey, normalized);\
      }\
    }' src/services/authService.ts
