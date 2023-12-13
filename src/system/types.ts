type RawConfig = { [s: string]: RawConfig | any };
type Constructor<T extends object> = new (...args: any[]) => T;

export { RawConfig, Constructor };
