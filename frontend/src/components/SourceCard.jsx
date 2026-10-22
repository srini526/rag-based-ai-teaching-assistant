import { FiArrowUpRight, FiFileText, FiPlayCircle } from "react-icons/fi";
export default function SourceCard({ source }) {
  const name = source.source_name || source.name || source.title || "Learning source";
  const location = source.page ? `Page ${source.page}` : source.slide ? `Slide ${source.slide}` : source.timestamp ? `Timestamp ${source.timestamp}` : source.location || "Relevant passage";
  const videoLike = /video|youtube|audio/i.test(source.source_type || "");
  return <article className="source-card"><span className={`source-card-icon ${videoLike ? "video" : ""}`}>{videoLike ? <FiPlayCircle /> : <FiFileText />}</span><div className="source-card-copy"><h3 title={name}>{name}</h3><p>{location}</p><span className="source-type-tag">{source.source_type || "SOURCE"}</span></div>{source.url && <a className="source-open-link" href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${name}`}><FiArrowUpRight /></a>}</article>;
}
