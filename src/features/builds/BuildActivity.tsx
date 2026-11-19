import { Eye, Heart, MessageSquare, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BuildRow } from "./api.ts";

export type BuildActivityValues = Pick<
  BuildRow,
  | "avg_rating"
  | "rating_count"
  | "like_count"
  | "view_count"
  | "comment_count"
  | "created_at"
>;

export function BuildActivity({ activity }: { activity: BuildActivityValues }) {
  const { t, i18n } = useTranslation();
  const full = new Intl.NumberFormat(i18n.language),
    compact = new Intl.NumberFormat(i18n.language, {
      notation: "compact",
      maximumFractionDigits: 1,
    }),
    rating = new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(activity.avg_rating);
  const date = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(activity.created_at));
  return (
    <div className="build-activity" role="group" aria-label={t("build_activity_label")}>
      <div className="build-activity-heading">
        <div className="build-activity-rating">
          <Star size={14} aria-hidden="true" />
          {activity.rating_count > 0 ? (
            <>
              <span className="sr-only">
                {t("build_activity_rating", { rating })}
              </span>
              <strong aria-hidden="true">{rating}</strong>
              <span>
                {t("build_activity_votes", {
                  count: activity.rating_count,
                  formatted: full.format(activity.rating_count),
                })}
              </span>
            </>
          ) : (
            <span>{t("build_activity_unrated")}</span>
          )}
        </div>
        <span className="build-activity-date">
          <span className="sr-only">{t("build_activity_published")} </span>
          <time dateTime={activity.created_at}>{date}</time>
        </span>
      </div>
      <dl className="build-activity-counts">
        {(
          [
            ["like_count", "likes", Heart],
            ["view_count", "views", Eye],
            ["comment_count", "comments", MessageSquare],
          ] as const
        ).map(([key, label, Icon]) => {
          const value = activity[key],
            exact = full.format(value),
            displayed = value >= 10000 ? compact.format(value) : exact;
          return (
            <div
              key={key}
              title={t("build_activity_exact", {
                label: t(`build_activity_${label}`),
                value: exact,
              })}
            >
              <dt>
                <Icon size={14} aria-hidden="true" />
                {t(`build_activity_${label}`)}
              </dt>
              <dd>
                {displayed === exact ? (
                  exact
                ) : (
                  <>
                    <span aria-hidden="true">{displayed}</span>
                    <span className="sr-only">{exact}</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
