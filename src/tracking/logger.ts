import chalk from 'chalk';

export interface LoggerConfig {
  verbose: boolean;
  showStats: boolean;
  noColor: boolean;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;

    if (config.noColor) {
      chalk.level = 0;
    }
  }

  banner(info: { port: number; target: string; scorer: string; threshold: number; version: string }): void {
    console.log('');
    console.log(chalk.green('  🌿 EcoPrompt CLI v' + info.version));
    console.log('');
    console.log(chalk.dim('  Proxy:     ') + chalk.white.bold('http://localhost:' + info.port));
    console.log(chalk.dim('  Target:    ') + chalk.white.bold(info.target));
    console.log(chalk.dim('  Scorer:    ') + chalk.white.bold(info.scorer + ' (threshold: ' + info.threshold + ')'));
    console.log('');
    console.log('  Ready to save you money! 💰');
    console.log('');
  }

  downgrade(originalModel: string, newModel: string, score: number, reason: string, savedAmount: number): void {
    console.log(
      chalk.green('🟢 DOWNGRADED') +
      '  ' +
      chalk.strikethrough(originalModel) +
      ' → ' +
      chalk.green.bold(newModel) +
      chalk.dim('  (score: ' + score.toFixed(2) + ', "' + reason + '")') +
      chalk.yellow('  💰 -$' + savedAmount.toFixed(4))
    );
  }

  keep(model: string, score: number, reason: string): void {
    console.log(
      chalk.blue('🔵 KEPT       ') +
      '  ' +
      chalk.bold(model) +
      chalk.dim('  (score: ' + score.toFixed(2) + ', "' + reason + '")')
    );
  }

  passthrough(path: string): void {
    console.log(
      chalk.gray('⚪ PASSTHROUGH') +
      '  ' +
      chalk.gray(path)
    );
  }

  debug(message: string): void {
    if (this.config.verbose) {
      console.log(chalk.gray('[DEBUG] ' + message));
    }
  }

  error(message: string, err?: Error): void {
    console.error(
      chalk.red('❌ ERROR') +
      '  ' +
      message,
      err ? err.stack : ''
    );
  }

  sessionStats(totalRequests: number, downgraded: number, totalSaved: number): void {
    if (!this.config.showStats || totalRequests <= 0) {
      return;
    }

    const pct = ((downgraded / totalRequests) * 100).toFixed(0);
    console.log(
      chalk.dim(
        '━━━ Session: ' +
        totalRequests +
        ' requests | ' +
        downgraded +
        ' downgraded (' +
        pct +
        '%) | $' +
        totalSaved.toFixed(2) +
        ' saved ━━━'
      )
    );
  }
}
