import { readFile, writeFile } from 'fs/promises';
import fs from 'fs';

async function run() {
  const updates = JSON.parse(fs.readFileSync('scratch-data.json', 'utf8'));
  const file = 'src/data/verbs/2601-2700.json';
  const data = JSON.parse(await readFile(file, 'utf8'));
  let changed = 0;
  for (const item of data) {
    const update = updates.find(u => u.id === item.id);
    if (update) {
      item.examples = [{
        pl: update.pl,
        en: update.en,
        uk: update.uk
      }];
      changed++;
    }
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${changed} verbs in ${file}`);
}
run().catch(console.error);
