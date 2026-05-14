import { useSupabasePreference } from "./userPreferences";

export type MetaConfig = {
  pageId: string;
  instagramUserId: string;
};

export const defaultMetaConfig: MetaConfig = {
  pageId: "",
  instagramUserId: "",
};

export function useMetaConfig() {
  return useSupabasePreference<MetaConfig>("meta-config", defaultMetaConfig);
}
