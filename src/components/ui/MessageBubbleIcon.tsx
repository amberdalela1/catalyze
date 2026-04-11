interface MessageBubbleIconProps {
  size?: number;
}

export default function MessageBubbleIcon({ size = 24 }: MessageBubbleIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 3C8.28 3 2 8.04 2 14.2C2 17.8 4.1 21 7.4 23.1L5.6 28.4C5.5 28.7 5.7 29 6 29C6.1 29 6.2 29 6.3 28.9L12.6 25.1C13.7 25.3 14.8 25.4 16 25.4C23.72 25.4 30 20.36 30 14.2C30 8.04 23.72 3 16 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
