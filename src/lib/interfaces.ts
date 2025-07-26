import type DescopeClient from '@descope/node-sdk';

interface RetrieveResult {
  date: Date;

  jToW: string[];

  wToJ: string[];
}

type Descope = ReturnType<typeof DescopeClient>;

interface Auth {
  Token(): Promise<string>;
}

export type { RetrieveResult, Auth, Descope };
