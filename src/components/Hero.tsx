import CoverRail from "./CoverRail";
import LightField from "./LightField";
import { IconGrid } from "./Icons";
import { profile, works } from "../data/site";

interface Props {
  onOpenWork: (id: string) => void;
  onOpenOverview: () => void;
}

export default function Hero({ onOpenWork, onOpenOverview }: Props) {
  return (
    <section className="hero" id="home">
      <LightField videoSrc={profile.heroVideo || undefined} />
      <div className="hero__scrim" />
      <div className="hero__grain" />

      <div className="hero__inner">
        <div className="hero__block">
          <p className="hero__kicker">
            <span className="hero__dot" />
            {profile.availability}
            <span className="hero__sep">/</span>
            {profile.role}
          </p>

          <h1 className="hero__title">
            作品集
            <em>PORTFOLIO · {profile.nameEn}</em>
          </h1>

          <div className="hero__row">
            <div>
              <p className="hero__byline">
                <strong>作者：{profile.name}</strong>
                <span>{profile.roleEn}</span>
              </p>
              <p className="hero__desc">{profile.introShort}</p>
            </div>

            <div className="hero__cta">
              <button className="btn btn--accent btn--lg" onClick={onOpenOverview}>
                <IconGrid size={16} />
                作品总览
              </button>
            </div>
          </div>
        </div>

        <CoverRail works={works} onOpen={onOpenWork} />
      </div>
    </section>
  );
}
