#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs-extra';
import prompts from 'prompts';

const TEMPLATES = {
  basic: {
    name: 'basic',
    display: 'Basic',
    description: 'Basic template'
  },
} as const;

async function main() {
  // コマンドライン引数から初期値を取得
  const defaultName = process.argv[2] || 'my-custom-block';

  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: defaultName
    },
    // {
    //   type: 'select',
    //   name: 'template',
    //   message: 'Select a template:',
    //   choices: Object.values(TEMPLATES).map(t => ({
    //     title: `${t.display} - ${t.description}`,
    //     value: t.name
    //   }))
    // }
  ]);

  // const { projectName, template } = response;
  const { projectName } = response;
  const template = Object.keys(TEMPLATES)[0];
  const templateDir = path.join(__dirname, '../template', template);
  
  // 常に新しいディレクトリを作成
  const targetDir = path.join(process.cwd(), projectName);

  // Check if target directory exists and is not empty
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: 'Directory exists and is not empty. Continue?',
      initial: false
    });

    if (!proceed) {
      console.log('Operation cancelled');
      return;
    }
  }

  // Copy template
  await fs.copy(templateDir, targetDir);
  await fs.rename(path.join(targetDir, 'dot.gitignore'), path.join(targetDir, '.gitignore'));

  // Update package.json name
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = await fs.readJson(pkgPath);
  pkg.name = projectName;
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  // npm installを実行
  console.log('Installing dependencies...');
  const { execSync } = require('child_process');
  execSync('npm install', { 
    cwd: targetDir,
    stdio: 'inherit'
  });

  console.log(`✨ Created ${projectName} successfully!`);
  console.log('To get started:');
  console.log(`  cd ${projectName}`);
  console.log('  npm run build -- --watch');
}

main().catch(console.error); 
