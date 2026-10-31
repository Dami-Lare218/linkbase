type WordmarkProps = {
  /** Font size. Pass a number for px, or any CSS length. */
  size?: number | string;
  className?: string;
};

/** The Linkbase name set in the display face. There is no logo mark. */
export function Wordmark({ size = 24, className = "" }: WordmarkProps) {
  return (
    <span
      className={`font-display leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-fg-primary ${className}`}
      style={{ fontSize: size }}
    >
      Linkbase
    </span>
  );
}
