export interface SettingsTypeMap {
  "setPrivate": boolean;
  "disableChecks": boolean;
}

export type SettingsSignature = { [K in keyof SettingsTypeMap]: SettingsTypeMap[K] };