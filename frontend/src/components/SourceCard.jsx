import { FiArrowUpRight, FiFileText, FiGlobe, FiPlayCircle } from "react-icons/fi";

export default function SourceCard({ source }) {
  const name = source.source_name || source.name || source.title || "Learning source";
  const location = source.page
    ? `Page ${source.page}`
    : source.slide
      ? `Slide ${source.slide}`
      : source.timestamp
        ? `Timestamp ${source.timestamp}`
        : source.location || "Relevant passage";

  const typeText = String(source.source_type || "SOURCE");
  const videoLike = /video|youtube|audio/i.test(typeText);
  const webLike = /web|url|http/i.test(typeText);

  const matchPercent =
    typeof source.score === "number"
      ? `${Math.max(1, Math.min(99, Math.round(source.score * 100)))}% match`
      : null;

  return (
    <article className="source-card">
      <span className={`source-card-icon ${videoLike ? "video" : ""}`}>
        {videoLike ? <FiPlayCircle /> : webLike ? <FiGlobe /> : <FiFileText />}
      </span>
      <div className="source-card-copy">
        <h3 title={name}>{name}</h3>
        <p>
          {location}
          {matchPercent ? ` · ${matchPercent}` : ""}
        </p>
        <span className="source-type-tag">{typeText}</span>
      </div>
      {source.url && (
        <a
          className="source-open-link"
          href={source.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${name}`}
          title={`Open ${name}`}
        >
          <FiArrowUpRight />
        </a>
      )}
    </article>
  );
}