sed -i 's/const targetId = userId || session?.id;//' src/services/authService.ts
sed -i '823a\
    const targetId = userId || session?.id;' src/services/authService.ts
