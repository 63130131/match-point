import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SUBPATH = process.env.DEPLOY_PATH ?? 'tenis'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'deploy', SUBPATH)

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'api'), { recursive: true })
mkdirSync(join(out, 'data'), { recursive: true })

cpSync(join(root, 'dist'), out, { recursive: true })
cpSync(join(root, 'php-api', 'index.php'), join(out, 'api', 'index.php'))
cpSync(join(root, 'php-api', 'db.php'), join(out, 'api', 'db.php'))
cpSync(join(root, 'php-api', 'data.htaccess'), join(out, 'data', '.htaccess'))

writeFileSync(
  join(out, 'api', '.htaccess'),
  `RewriteEngine On
RewriteBase /${SUBPATH}/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [L]
`,
)

console.log('Ready to upload:', out)
console.log(`Upload everything inside deploy/${SUBPATH}/ to public_html/${SUBPATH}/`)
console.log(`Your app URL: https://yourdomain.com/${SUBPATH}`)
