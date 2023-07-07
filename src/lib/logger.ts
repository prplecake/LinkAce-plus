export class Logger {
  context: string;

  constructor(context: string) {
    this.context = `[${context}]: `;
  }

  getContext = () => {
    return this.context;
  };

  log = (...args: any[]) => {
    args.unshift(this.context);
    console.log.apply(this, args);
  };

  info = (...args: any[]) => {
    args.unshift(this.context);
    console.info.apply(this, args);
  };

  error = (...args: any[]) => {
    args.unshift(this.context);
    console.error.apply(this, args);
  };

  warn = (...args: any[]) => {
    args.unshift(this.context);
    console.warn.apply(this, args);
  };
}