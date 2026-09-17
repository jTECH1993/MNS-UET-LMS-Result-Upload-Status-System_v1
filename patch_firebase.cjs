const fs = require('fs');
let code = fs.readFileSync('src/lib/firebaseStore.ts', 'utf8');

code = code.replace(
  /static listenGlobalState\(key: string, callback: \(data: any\) => void\) \{\n\s*return onSnapshot\(doc\(db, 'config', key\), \(docSnap\) => \{\n\s*if \(docSnap\.exists\(\)\) \{\n\s*callback\(docSnap\.data\(\)\.data\);\n\s*\}\n\s*\}\);/,
  `static listenGlobalState(key: string, callback: (data: any) => void) {
    return onSnapshot(doc(db, 'config', key), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data);
      } else {
        callback(undefined);
      }
    });`
);

fs.writeFileSync('src/lib/firebaseStore.ts', code);
