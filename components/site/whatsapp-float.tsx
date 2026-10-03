import type { ComponentProps } from "react";

export function WhatsAppIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.3 14.97l-.3-.19-3.02.88.9-2.93-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.3 4.1c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.86 4.44 3.9 2.2.86 2.64.69 3.12.65.48-.05 1.54-.63 1.76-1.24.22-.6.22-1.12.15-1.23-.06-.11-.24-.17-.5-.3-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.59.13-.17.26-.67.85-.82 1.02-.15.17-.3.2-.56.07-.26-.13-1.1-.4-2.1-1.3-.77-.68-1.3-1.53-1.45-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.58-1.42-.8-1.94-.2-.5-.42-.44-.59-.45l-.48-.02Z" />
    </svg>
  );
}

export function WhatsAppFloat({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      className="fixed right-5 bottom-5 z-30 flex size-13 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/15 transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-[#25d366]/40 focus-visible:outline-none"
    >
      <WhatsAppIcon className="size-6.5" />
    </a>
  );
}
