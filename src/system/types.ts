// biome-ignore lint/suspicious/noExplicitAny: Config can be anything
type RawConfig = { [s: string]: RawConfig | any };

// biome-ignore lint/suspicious/noExplicitAny: Constructor accepts all
type Constructor<T extends object> = new (...args: any[]) => T;

export type { RawConfig, Constructor };
