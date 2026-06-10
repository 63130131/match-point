import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FOLDER = process.env.DEPLOY_PATH ?? 'tenis'
const URL_PATH = process.env.URL_PATH ?? (FOLDER === 'root' ? '' : FOLDER)
const urlBase = URL_PATH ? `/${URL_PATH}` : ''
const rewriteBase = urlBase ? `${urlBase}/` : '/'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'deploy', FOLDER)

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'api'), { recursive: true })
mkdirSync(join(out, 'data'), { recursive: true })
mkdirSync(join(out, 'uploads'), { recursive: true })

cpSync(join(root, 'dist'), out, { recursive: true })
cpSync(join(root, 'php-api', 'index.php'), join(out, 'api', 'index.php'))
cpSync(join(root, 'php-api', 'db.php'), join(out, 'api', 'db.php'))
cpSync(join(root, 'php-api', 'auth.php'), join(out, 'api', 'auth.php'))
cpSync(join(root, 'php-api', 'config.example.php'), join(out, 'api', 'config.example.php'))
cpSync(join(root, 'php-api', 'data.htaccess'), join(out, 'data', '.htaccess'))
cpSync(join(root, 'php-api', 'uploads.htaccess'), join(out, 'uploads', '.htaccess'))

writeFileSync(
  join(out, 'api', '.htaccess'),
  `RewriteEngine On
RewriteBase ${rewriteBase}api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [L]
`,
)

const rootHtaccess = readFileSync(join(root, 'php-api', 'root.htaccess'), 'utf8').replaceAll(
  '/__BASE__/',
  rewriteBase,
)
writeFileSync(join(out, '.htaccess'), rootHtaccess)

console.log('Ready to upload:', out)
if (urlBase) {
  console.log(`Upload everything inside deploy/${FOLDER}/ to your subdomain folder${urlBase}/`)
  console.log(`Example URL: https://matchpoint.web-tribe.si${urlBase}`)
} else {
  console.log(`Upload everything inside deploy/${FOLDER}/ to your subdomain root folder`)
  console.log('Example URL: https://matchpoint.web-tribe.si/')
}
