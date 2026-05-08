'use strict';

const chalk = require('chalk');
const { spawn, execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function cleanup() {
  console.log(chalk.yellow('\n\uD83E\uDDF9 Shutting down demo...\n'));

  // Kill Corvin Studio
  try {
    if (fs.existsSync('/tmp/corvin-studio.pid')) {
      const studioPid = fs.readFileSync('/tmp/corvin-studio.pid', 'utf8').trim();
      process.kill(parseInt(studioPid), 'SIGTERM');
    }
  } catch (_) {}

  // Kill Corvin server (runs in its own tmux session)
  try {
    execSync('tmux kill-session -t corvin-server 2>/dev/null');
  } catch (_) {}

  // Kill main tmux session — demo-launcher.sh EXIT trap handles final cleanup
  try {
    execSync('tmux kill-session -t corvin');
  } catch (_) {
    process.exit(0);
  }
}

function showHeader() {
  console.log(
    chalk.bold.green('\u2705 Corvin Demo') +
      chalk.gray('  |  ') +
      chalk.cyan('Studio: ') +
      chalk.bold.blue.underline('http://localhost:4173')
  );
  console.log(chalk.gray('\u2500'.repeat(50)));
}

function showMenu() {
  console.clear();
  showHeader();

  console.log(chalk.bold('\nChoose a bug:\n'));
  console.log('[1] \uD83D\uDD0C Contract Drift');
  console.log('    Orders expects fullName, Checkout sends firstName/lastName\n');
  console.log('[2] \uD83C\uDDEA\uD83C\uDDFA Missing EU Tax Config');
  console.log('    Tax calculation fails for German orders\n');
  console.log('[3] \u23F1\uFE0F  Payment Timeout Race');
  console.log('    Order cancelled at 3s, payment succeeds at 4s\n');
  console.log('[q] \u274C Quit\n');

  promptUser();
}

function waitForContinue() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(chalk.gray('Press Enter for menu...'), () => {
    rl.close();
    showMenu();
  });
}

function triggerBug(bugNum, bugName, debugQuestion) {
  console.clear();
  showHeader();

  console.log(chalk.yellow(`\n\uD83D\uDC1B Triggering: ${bugName}...\n`));
  console.log(chalk.gray('Watch the service logs above \u2B06\uFE0F\n'));

  const test = spawn('npm', ['run', `demo:${bugNum}`], {
    cwd: PROJECT_ROOT,
    stdio: 'ignore',
  });

  test.on('close', (code) => {
    console.clear();
    showHeader();

    if (code === 0) {
      console.log(chalk.green('\n\u2705 Bug triggered!\n'));
    } else {
      console.log(chalk.red('\n\u26A0\uFE0F  Bug triggered (check logs above)\n'));
    }

    console.log(chalk.cyan('\uD83D\uDCAC In Corvin Studio, ask:\n'));
    console.log(chalk.bold.white(`   "${debugQuestion}"\n`));
    console.log(chalk.gray('\u2500'.repeat(50) + '\n'));

    waitForContinue();
  });
}

function promptUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(chalk.bold('Select [1-3]: '), (answer) => {
    rl.close();

    switch (answer.trim()) {
      case '1':
        triggerBug('bug1', 'Contract Drift',
          'Checkout is failing with fullName validation error');
        break;
      case '2':
        triggerBug('bug2', 'Missing EU Tax Config',
          'Tax calculation failing for German orders');
        break;
      case '3':
        triggerBug('bug3', 'Payment Timeout Race',
          'Order was cancelled but payment succeeded');
        break;
      case 'q':
        cleanup();
        break;
      default:
        console.log(chalk.red('\nInvalid choice'));
        setTimeout(showMenu, 1000);
    }
  });
}

process.on('SIGINT', () => {
  cleanup();
});

showMenu();
