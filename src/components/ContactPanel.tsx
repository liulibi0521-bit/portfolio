import Overlay from "./Overlay";
import { IconDownload } from "./Icons";
import { profile } from "../data/site";

interface Props {
  onClose: () => void;
}

export default function ContactPanel({ onClose }: Props) {
  const head = (
    <div>
      <h2 className="sheet__title" id="contact-title">联系方式</h2>
      <p className="sheet__count">招聘方可直接来信，也可先看简历</p>
    </div>
  );

  return (
    <Overlay titleId="contact-title" label="联系方式" onClose={onClose} head={head}>
      <div className="contact-panel">
        <div className="contact-panel__main">
          <div className="contact-panel__profile">
            <div className="contact-panel__avatar">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  width={240}
                  height={240}
                  decoding="async"
                />
              ) : (
                profile.initials
              )}
            </div>
            <h3 className="contact-panel__name">{profile.name}</h3>
            <p className="contact-panel__name-en">{profile.nameEn}</p>
            <p className="contact-panel__major">{profile.role}</p>
          </div>
        </div>

        <div className="contact-panel__side">
          <div className="list">
            {profile.contacts.map((c) => (
              <a className="list__row" href={c.href} key={c.label}>
                <span className="list__body">
                  <span className="list__label">{c.label}</span>
                  <span className="list__value">{c.value}</span>
                </span>
              </a>
            ))}
            <div className="list__row">
              <span className="list__body">
                <span className="list__label">所在地</span>
                <span className="list__value">{profile.city}</span>
              </span>
            </div>
            <a
              className="list__row"
              href={profile.resume.href}
              download={profile.resume.downloadName}
            >
              <span className="list__body">
                <span className="list__label">简历</span>
                <span className="list__value">下载 PDF · {profile.resume.note}</span>
              </span>
              <span className="list__chev">
                <IconDownload size={16} />
              </span>
            </a>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
