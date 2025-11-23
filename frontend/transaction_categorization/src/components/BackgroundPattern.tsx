export default function BackgroundPattern() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#f9fafb', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#f3f4f6', stopOpacity: 1 }} />
                    </linearGradient>
                </defs>

                {/* Background */}
                <rect width="1000" height="1000" fill="url(#grad1)" />

                {/* Curved lines pattern */}
                <g opacity="0.15" stroke="#9ca3af" strokeWidth="1" fill="none">
                    {/* Top curves */}
                    <path d="M 0,100 Q 250,50 500,100 T 1000,100" />
                    <path d="M 0,120 Q 250,70 500,120 T 1000,120" />
                    <path d="M 0,140 Q 250,90 500,140 T 1000,140" />
                    <path d="M 0,160 Q 250,110 500,160 T 1000,160" />
                    <path d="M 0,180 Q 250,130 500,180 T 1000,180" />

                    {/* Middle curves */}
                    <path d="M 0,400 Q 200,350 400,400 T 800,400" />
                    <path d="M 200,400 Q 400,450 600,400 T 1000,400" />
                    <path d="M 0,420 Q 200,370 400,420 T 800,420" />
                    <path d="M 200,420 Q 400,470 600,420 T 1000,420" />

                    {/* Diagonal curves */}
                    <path d="M 100,0 Q 150,250 200,500 T 300,1000" />
                    <path d="M 300,0 Q 350,250 400,500 T 500,1000" />
                    <path d="M 500,0 Q 550,250 600,500 T 700,1000" />
                    <path d="M 700,0 Q 750,250 800,500 T 900,1000" />

                    {/* Bottom curves */}
                    <path d="M 0,800 Q 250,750 500,800 T 1000,800" />
                    <path d="M 0,820 Q 250,770 500,820 T 1000,820" />
                    <path d="M 0,840 Q 250,790 500,840 T 1000,840" />

                    {/* Circular patterns */}
                    <circle cx="200" cy="200" r="100" />
                    <circle cx="200" cy="200" r="120" />
                    <circle cx="200" cy="200" r="140" />

                    <circle cx="800" cy="700" r="80" />
                    <circle cx="800" cy="700" r="100" />
                    <circle cx="800" cy="700" r="120" />

                    {/* Grid lines */}
                    <path d="M 400,200 L 600,400 L 500,600 L 300,400 Z" />
                    <path d="M 420,220 L 620,420 L 520,620 L 320,420 Z" />
                </g>
            </svg>
        </div>
    );
}
