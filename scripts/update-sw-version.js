#!/usr/bin/env node

/**
 * Script para incrementar automaticamente a versão do Service Worker
 *
 * Uso:
 * node scripts/update-sw-version.js
 *
 * Ou adicione ao package.json:
 * "scripts": {
 *   "update-sw": "node scripts/update-sw-version.js"
 * }
 */

const fs = require('fs')
const path = require('path')

const SW_PATH = path.join(__dirname, '..', 'public', 'sw.js')

try {
    // Lê o arquivo do service worker
    let content = fs.readFileSync(SW_PATH, 'utf8')

    // Encontra a linha da versão
    const versionRegex = /const VERSION = "([\d.]+)"/
    const match = content.match(versionRegex)

    if (!match) {
        console.error('❌ Não foi possível encontrar a versão no sw.js')
        process.exit(1)
    }

    const currentVersion = match[1]
    console.log(`📦 Versão atual: ${currentVersion}`)

    // Incrementa a versão
    const parts = currentVersion.split('.')
    parts[2] = parseInt(parts[2]) + 1
    const newVersion = parts.join('.')

    // Atualiza o conteúdo
    content = content.replace(versionRegex, `const VERSION = "${newVersion}"`)

    // Salva o arquivo
    fs.writeFileSync(SW_PATH, content, 'utf8')

    console.log(`✅ Versão atualizada para: ${newVersion}`)
    console.log(`\n💡 Dica: Faça commit e deploy para que os usuários recebam a atualização`)

} catch (error) {
    console.error('❌ Erro ao atualizar versão:', error.message)
    process.exit(1)
}
