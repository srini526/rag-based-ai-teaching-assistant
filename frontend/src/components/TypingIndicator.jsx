export function StudyMascot({ mood = "happy", className = "" }) {
  const isThinking = mood === "thinking";
  const isCelebrating = mood === "celebrating";

  return (
    <span
      className={`mascot-character ${mood} ${className}`.trim()}
      aria-hidden="true"
    >
      <svg className="mascot-svg" viewBox="0 0 100 100" fill="none">
        {/* Floating Sparkles */}
        <path
          className="mascot-sparkle"
          d="M14 22L16.5 16L19 22L25 24.5L19 27L16.5 33L14 27L8 24.5L14 22Z"
          fill="#F59E0B"
        />
        <circle
          className="mascot-sparkle delay-1"
          cx="86"
          cy="24"
          r="4"
          fill="#34D399"
        />
        <circle
          className="mascot-sparkle delay-2"
          cx="15"
          cy="76"
          r="3.5"
          fill="#A78BFA"
        />

        {/* Antenna & Star Crown */}
        <g className="mascot-antenna">
          <path
            d="M50 26V14"
            stroke="#7C5CFC"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="50" cy="11" r="6" fill="#FBBF24" stroke="#7C5CFC" strokeWidth="3" />
        </g>

        {/* Cute Side Ears / Wings */}
        <ellipse cx="19" cy="54" rx="7" ry="11" fill="#DDD6FE" stroke="#7C5CFC" strokeWidth="3.5" />
        <ellipse cx="81" cy="54" rx="7" ry="11" fill="#DDD6FE" stroke="#7C5CFC" strokeWidth="3.5" />

        {/* Main Pastel Body */}
        <rect
          x="22"
          y="25"
          width="56"
          height="54"
          rx="26"
          fill="url(#lumiBodyGrad)"
          stroke="#7C5CFC"
          strokeWidth="4"
        />

        {/* Soft Face Screen */}
        <rect
          x="29"
          y="35"
          width="42"
          height="33"
          rx="16"
          fill="#FFFFFF"
          stroke="#E9D5FF"
          strokeWidth="2"
        />

        {/* Rosy Pastel Cheeks */}
        <ellipse cx="35" cy="56" rx="4.5" ry="2.6" fill="#FDA4AF" opacity="0.85" />
        <ellipse cx="65" cy="56" rx="4.5" ry="2.6" fill="#FDA4AF" opacity="0.85" />

        {/* Expressive Eyes */}
        {isCelebrating ? (
          <>
            <path
              d="M36 49C37.8 45.5 41.5 45.5 43.3 49"
              stroke="#26223B"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <path
              d="M56.7 49C58.5 45.5 62.2 45.5 64 49"
              stroke="#26223B"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <g className="mascot-eye">
            <circle cx="40" cy="48" r="4.2" fill="#26223B" />
            <circle cx="38.7" cy="46.6" r="1.5" fill="#FFFFFF" />
            <circle cx="60" cy="48" r="4.2" fill="#26223B" />
            <circle cx="58.7" cy="46.6" r="1.5" fill="#FFFFFF" />
          </g>
        )}

        {/* Thinking Glasses when busy/streaming */}
        {isThinking && (
          <g stroke="#7C5CFC" strokeWidth="2.4">
            <circle cx="40" cy="48" r="7.5" fill="rgba(124, 92, 252, 0.08)" />
            <circle cx="60" cy="48" r="7.5" fill="rgba(124, 92, 252, 0.08)" />
            <path d="M47.5 48H52.5" strokeLinecap="round" />
          </g>
        )}

        {/* Mouth Expression */}
        {isThinking ? (
          <circle cx="50" cy="57.5" r="2.8" fill="#7C5CFC" />
        ) : isCelebrating ? (
          <path
            d="M44 55C45.5 60 54.5 60 56 55Z"
            fill="#F43F5E"
            stroke="#26223B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M45 55.5C47 58.8 53 58.8 55 55.5"
            stroke="#26223B"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Cute Book / Badge at Bottom */}
        <path
          d="M39 78C39 74.5 44 73 50 75C56 73 61 74.5 61 78V84C55 82 45 82 39 84V78Z"
          fill="#A7F3D0"
          stroke="#10B981"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        <defs>
          <linearGradient id="lumiBodyGrad" x1="22" y1="25" x2="78" y2="79" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EDE9FE" />
            <stop offset="0.55" stopColor="#DDD6FE" />
            <stop offset="1" stopColor="#FCE7F3" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export default function TypingIndicator() {
  return (
    <div className="assistant-message-row typing-row" role="status" aria-live="polite">
      <div className="assistant-avatar">
        <StudyMascot mood="thinking" />
      </div>
      <div className="typing-card">
        <div className="typing-label">
          Lumi is connecting the dots from your sources
          <span className="typing-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="typing-progress">
          <span />
        </div>
      </div>
    </div>
  );
}