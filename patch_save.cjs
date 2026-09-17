const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

code = code.replace(
  /FirebaseStore\.saveSubmission\(record\)\.catch\(e => console\.error\('Firebase save failed', e\)\);\n\s*const sec = \(record\.section \|\| 'A'\)\.trim\(\)\.toUpperCase\(\);\n\s*const key = getRecordKey\([\s\S]*?\);\n\s*const store = this\.getStore\(\);\n\s*store\[key\] = \{\n\s*\.\.\.record,\n\s*id: key,\n\s*section: sec,\n\s*shift: record\.shift \|\| 'Morning',\n\s*session: \(record\.session \|\| '2023'\)\.trim\(\),\n\s*semester: \(record\.semester \|\| '1'\)\.trim\(\),\n\s*accessedBy: activeUser\.name,\n\s*userDesignation: activeUser\.designation,\n\s*updatedAt: new Date\(\)\.toISOString\(\),\n\s*createdAt: isUpdate \? store\[key\]\?\.createdAt \|\| new Date\(\)\.toISOString\(\) : new Date\(\)\.toISOString\(\),\n\s*\};\n\s*this\.setStore\(store\);/,
  `const sec = (record.section || 'A').trim().toUpperCase();
      const key = getRecordKey(
        record.department,
        record.program,
        record.degreeLevel,
        record.shift || 'Morning',
        record.session || '2023',
        record.semester || '1',
        sec
      );
      const store = this.getStore();
      const completeRecord = {
        ...record,
        id: key,
        section: sec,
        shift: record.shift || 'Morning',
        session: (record.session || '2023').trim(),
        semester: (record.semester || '1').trim(),
        accessedBy: activeUser.name,
        userDesignation: activeUser.designation,
        updatedAt: new Date().toISOString(),
        createdAt: isUpdate ? store[key]?.createdAt || new Date().toISOString() : new Date().toISOString(),
      };
      
      store[key] = completeRecord;
      this.setStore(store);
      
      // Update Firebase with the FULL record
      FirebaseStore.saveSubmission(completeRecord).catch(e => console.error('Firebase save failed', e));`
);

fs.writeFileSync('src/services/storageService.ts', code);
