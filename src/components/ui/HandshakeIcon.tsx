interface HandshakeIconProps {
  size?: number;
}

export default function HandshakeIcon({ size = 24 }: HandshakeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        d="M11.07 8.82S9.26 6.92 8.35 6a2.8 2.8 0 0 0-2-.82H2v10h3.3c.56 0 1.1.22 1.5.6l2.47 2.44c.18.2.5.2.68 0l1.7-1.64c.18-.18.2-.5 0-.68l-2.2-2.2a.5.5 0 0 1 0-.7.5.5 0 0 1 .7 0l3.73 3.66c.2.18.5.18.68 0l1.56-1.54c.2-.18.2-.5 0-.68L12.4 11.5a.5.5 0 0 1 0-.7.5.5 0 0 1 .7 0l3.96 3.9c.18.18.5.18.68 0l1.42-1.42c.18-.2.18-.5 0-.7L15.1 8.63a.5.5 0 0 1 0-.7.5.5 0 0 1 .7 0l2.92 2.87c.2.2.5.2.7 0l1.17-1.15c.2-.2.2-.5 0-.7l-4.88-4.77a2.8 2.8 0 0 0-2-.82H11.3L9 5.38l2.07 2.08c.52.5.52 1.33 0 1.84a1.3 1.3 0 0 1-2-.48z"
      />
    </svg>
  );
}
