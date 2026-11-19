import { useState } from "react";
import Overlay from "./Overlay";
import { categories, formatOf, isTall, siteFlags, works } from "../data/site";
import type { CategoryId } from "../data/site";

type Filter = "all" | CategoryId;

interface Props {
  onClose: () => void;
  onOpen: (id: string) => void;
}

export default function WorkOverview({ onClose, onOpen }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = categories.filter((c) => filter === "all" || c.id === filter);
  const count = filter === "all" ? works.length : works.filter((w) => w.category === filter).length;

  const head = (
    <>
      <div>
        <h2 className="sheet__title" id="overview-title">作品总览</h2>
        <p className="sheet__count">
          按媒介分三类 · 共 {works.length} 件 · 当前 {count} 件
          {siteFlags.sampleWorks && <span className="sample-chip">示例内容</span>}
        </p>
      </div>
      <div className="seg" role="group" aria-label="按类别筛选">
        <button
          className="seg__btn"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          全部
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`seg__btn tag--${c.id}`}
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <Overlay titleId="overview-title" label="作品总览" onClose={onClose} head={head}>
      {shown.map((c) => {
        const items = works.filter((w) => w.category === c.id);
        return (
          <section className="ov-group" key={c.id}>
            <div className="ov-group__head">
              <h3 className="ov-group__name">
                <span className={`tag--${c.id}`}>{c.name}</span>
              </h3>
              <span className="ov-group__en">{c.en}</span>
              <span className="ov-group__n">{items.length} 件</span>
            </div>
            <p className="lede" style={{ margin: "0 0 calc(var(--u) * 0.55)", fontSize: "calc(14px * var(--site-type,1))" }}>
              {c.blurb}
            </p>
            <div className="ov-grid">
              {items.map((w) => {
                const kicker = w.titleEn || w.year || formatOf(w);
                return (
                <button
                  key={w.id}
                  type="button"
                  className="ov-card"
                  aria-label={`打开作品预览：${w.title}`}
                  onClick={() => onOpen(w.id)}
                >
                  <span
                    className="ov-card__shot"
                    data-fit={isTall(w.coverSize) ? "contain" : "cover"}
                    style={{ ["--poster" as string]: `url("${w.cover}")` }}
                  >
                    <img src={w.cover} alt={`${w.title} 封面`} loading="lazy" decoding="async" />
                  </span>
                  <span className="ov-card__foot">
                    <span>
                      <span className="ov-card__t">{w.title}</span>
                      {kicker && (
                        <span className="ov-card__k" style={{ display: "block" }}>
                          {kicker}
                        </span>
                      )}
                    </span>
                    <span className="ov-card__k">{w.duration}</span>
                  </span>
                </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </Overlay>
  );
}
