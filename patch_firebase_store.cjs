const fs = require('fs');
let code = fs.readFileSync('src/lib/firebaseStore.ts', 'utf8');

if (!code.includes('syncGlobalState')) {
  code = code.replace(
    "export class FirebaseStore {",
    "export class FirebaseStore {\n  static async syncGlobalState(key: string, data: any) {\n    await setDoc(doc(db, 'config', key), { data });\n  }\n\n  static listenGlobalState(key: string, callback: (data: any) => void) {\n    return onSnapshot(doc(db, 'config', key), (docSnap) => {\n      if (docSnap.exists()) {\n        callback(docSnap.data().data);\n      }\n    });\n  }\n"
  );
  fs.writeFileSync('src/lib/firebaseStore.ts', code);
}
