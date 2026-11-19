import { IconDownload, IconMail } from "./Icons";
import { profile } from "../data/site";
import { useScrolled } from "../hooks/useSite";

interface Props {
  onOpenContact: () => void;
}

export default function TopBar({ onOpenContact }: Props) {
  const raised = useScrolled(60);

  return (
    <div className="bar">
      <div className={`bar__inner${raised ? " is-raised" : ""}`}>
        <a className="brand" href="#home">
          <span className="brand__mark">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt=""
                aria-hidden="true"
                width={240}
                height={240}
                decoding="async"
              />
            ) : (
              profile.initials
            )}
          </span>
          <span className="brand__meta">
            <span className="brand__name">{profile.name}</span>
            <span className="brand__role">{profile.roleEn}</span>
          </span>
        </a>

        <div className="bar__actions">
          <button className="btn" onClick={onOpenContact}>
            <IconMail size={15} />
            联系方式
          </button>
          <a
            className="btn"
            href={profile.resume.href}
            download={profile.resume.downloadName}
            title={`下载简历（${profile.resume.note}）`}
          >
            <IconDownload size={15} />
            简历
          </a>
        </div>
      </div>
    </div>
  );
}
