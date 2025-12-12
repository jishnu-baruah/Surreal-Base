#!/usr/bin/env node

/**
 * Simple script to verify that all @/ imports can be resolved
 */

const fs = require('fs');
const path = require('path');

function findTsFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            findTsFiles(fullPath, files);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }

    return files;
}

function checkImports() {
    const srcDir = path.join(__dirname, 'src');
    const tsFiles = findTsFiles(srcDir);

    console.log(`Checking ${tsFiles.length} TypeScript files for @/ imports...`);

    let totalImports = 0;
    let missingFiles = [];

    for (const file of tsFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const imports = content.match(/from ['"]@\/[^'"]+['"]/g) || [];

        for (const importStatement of imports) {
            totalImports++;
            const importPath = importStatement.match(/from ['"]@\/([^'"]+)['"]/)[1];
            const fullPath = path.join(srcDir, importPath);

            // Check if it's a .ts or .tsx file
            const possiblePaths = [
                fullPath + '.ts',
                fullPath + '.tsx',
                path.join(fullPath, 'index.ts'),
                path.join(fullPath, 'index.tsx')
            ];

            const exists = possiblePaths.some(p => fs.existsSync(p));

            if (!exists) {
                missingFiles.push({
                    file: file.replace(__dirname + path.sep, ''),
                    import: importPath,
                    statement: importStatement
                });
            }
        }
    }

    console.log(`Found ${totalImports} @/ imports`);

    if (missingFiles.length === 0) {
        console.log('✅ All @/ imports can be resolved!');
        return true;
    } else {
        console.log(`❌ Found ${missingFiles.length} unresolvable imports:`);
        for (const missing of missingFiles) {
            console.log(`  ${missing.file}: ${missing.statement}`);
        }
        return false;
    }
}

if (require.main === module) {
    const success = checkImports();
    process.exit(success ? 0 : 1);
}

module.exports = { checkImports };