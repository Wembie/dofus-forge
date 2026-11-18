import { useTranslation } from "react-i18next";
import labels from "./stat-labels.json";

/** The 73 sheet fields, in the sheet's order. Spanish source: stat-labels.json; copy: stat_v4_<key>. */
export type StatLabelKey = keyof typeof labels;
export const STAT_LABEL_KEYS = Object.keys(labels) as StatLabelKey[];

/** Label of a sheet field in the page's language. */
export function useStatLabel() {
  const { t } = useTranslation();
  return (key: StatLabelKey | string) => t("stat_v4_" + key);
}
