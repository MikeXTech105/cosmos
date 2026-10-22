import { useEffect, useId, useMemo, useState } from "react";

import {
  formatOeePercent,
  getOeeRating,
  OEE_RATING_BANDS,
} from "./oeeHelpers";

const VIEWBOX_WIDTH = 220;
const VIEWBOX_HEIGHT = 132;
const CENTER_X = 110;
const CENTER_Y = 112;
const ARC_RADIUS = 84;
const TRACK_WIDTH = 10;
const NEEDLE_LENGTH = 72;

const clampOeeValue = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numericValue));
};

const valueToAngle = (value) => 180 - (clampOeeValue(value) / 100) * 180;

const polarPoint = (value, radius = ARC_RADIUS) => {
  const angle = (valueToAngle(value) * Math.PI) / 180;

  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y - radius * Math.sin(angle),
  };
};

const arcPath = (startValue, endValue) => {
  const start = polarPoint(startValue);
  const end = polarPoint(endValue);
  const largeArcFlag = 0;

  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${largeArcFlag} 1`,
    `${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(" ");
};

const Tick = ({ value, showLabel }) => {
  const outer = polarPoint(value, ARC_RADIUS + 8);
  const inner = polarPoint(value, ARC_RADIUS - 8);
  const label = polarPoint(value, ARC_RADIUS - 24);

  return (
    <g>
      <line
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke="#94a3b8"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      {showLabel && (
        <text
          x={label.x}
          y={label.y + 3}
          textAnchor="middle"
          className="hidden fill-slate-400 text-[8px] font-semibold sm:block"
        >
          {value}
        </text>
      )}
    </g>
  );
};

const OeeSpeedometer = ({ showTicks = true, size = 220, value = 0 }) => {
  const titleId = useId();
  const descId = useId();
  const safeValue = clampOeeValue(value);
  const displayValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const [animatedValue, setAnimatedValue] = useState(0);
  const rating = useMemo(() => getOeeRating(safeValue), [safeValue]);
  const rotation = (animatedValue / 100) * 180 - 90;
  const maxWidth = typeof size === "number" ? `${size}px` : size;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setAnimatedValue(safeValue);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [safeValue]);

  return (
    <div className="mx-auto w-full" style={{ maxWidth }}>
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-auto w-full overflow-visible"
      >
        <title id={titleId}>
          {`OEE gauge showing ${formatOeePercent(displayValue)} - ${rating.label}`}
        </title>
        <desc id={descId}>
          Half-circle OEE speedometer with red, amber, yellow, and green rating
          zones. The needle points to {formatOeePercent(safeValue)}.
          {displayValue > 100 ? ` Actual OEE is ${formatOeePercent(displayValue)}; the needle stops at 100%.` : ""}
        </desc>

        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="#e2e8f0"
          strokeLinecap="round"
          strokeWidth={TRACK_WIDTH + 2}
        />

        {OEE_RATING_BANDS.map((band) => (
          <path
            key={band.label}
            d={arcPath(band.min, band.max)}
            fill="none"
            stroke={band.color}
            strokeLinecap="round"
            strokeWidth={TRACK_WIDTH}
          />
        ))}

        {showTicks &&
          OEE_RATING_BANDS.map((band) => (
            <Tick key={band.min} value={band.min} showLabel={showTicks} />
          ))}
        {showTicks && <Tick value={100} showLabel={showTicks} />}

        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformBox: "view-box",
            transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
            transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <path
            d={[
              `M ${CENTER_X - 5} ${CENTER_Y + 5}`,
              `L ${CENTER_X} ${CENTER_Y - NEEDLE_LENGTH}`,
              `L ${CENTER_X + 5} ${CENTER_Y + 5}`,
              "Z",
            ].join(" ")}
            fill="#0f172a"
          />
          <path
            d={[
              `M ${CENTER_X - 2} ${CENTER_Y + 3}`,
              `L ${CENTER_X} ${CENTER_Y - NEEDLE_LENGTH + 10}`,
              `L ${CENTER_X + 2} ${CENTER_Y + 3}`,
              "Z",
            ].join(" ")}
            fill="#f8fafc"
            opacity="0.5"
          />
        </g>

        <circle cx={CENTER_X} cy={CENTER_Y} r="12" fill="#0f172a" />
        <circle cx={CENTER_X} cy={CENTER_Y} r="5" fill="white" />
      </svg>
    </div>
  );
};

export default OeeSpeedometer;
