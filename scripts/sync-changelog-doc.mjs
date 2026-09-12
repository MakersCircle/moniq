// Copies docs/CHANGELOG.md into src/docs/changelog.mdx so the in-app Docs
// viewer always shows the current changelog without duplicating it by hand.
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
copyFileSync(join(root, 'docs/CHANGELOG.md'), join(root, 'src/docs/changelog.mdx'));
