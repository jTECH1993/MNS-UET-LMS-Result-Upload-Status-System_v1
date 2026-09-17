const fs = require('fs');
let code = fs.readFileSync('src/components/UserAccountsModal.tsx', 'utf8');

if (!code.includes('mnsuet_accounts_updated')) {
  code = code.replace(
    "  }, [isOpen]);",
    "  }, [isOpen]);\n\n  useEffect(() => {\n    const handleAccountsUpdate = () => {\n      if (isOpen) loadAccounts();\n    };\n    window.addEventListener('mnsuet_accounts_updated', handleAccountsUpdate);\n    window.addEventListener('mnsuet_auth_changed', handleAccountsUpdate);\n    return () => {\n      window.removeEventListener('mnsuet_accounts_updated', handleAccountsUpdate);\n      window.removeEventListener('mnsuet_auth_changed', handleAccountsUpdate);\n    };\n  }, [isOpen]);"
  );
  fs.writeFileSync('src/components/UserAccountsModal.tsx', code);
}
