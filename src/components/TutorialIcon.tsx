export function TutorialIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tbGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
            </defs>
            <rect x="6" y="6" width="88" height="72" rx="18" ry="18" stroke="url(#tbGrad)" strokeWidth="7" fill="none" />
            <polygon points="38,28 38,56 66,42" fill="url(#tbGrad)" />
            <path d="M42 78 L50 95 L58 78" fill="url(#tbGrad)" />
        </svg>
    );
}
