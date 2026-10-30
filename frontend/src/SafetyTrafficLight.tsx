interface SafetyTrafficLightProps {
    isSafe: boolean;
}

export function SafetyTrafficLight({ isSafe }: SafetyTrafficLightProps) {
    const lamps = [
        { color: '#ef4444', label: '위험', active: !isSafe },
        { color: '#facc15', label: '주의', active: false },
        { color: '#22c55e', label: '안전', active: isSafe },
    ];

    return (
        <div
            role="img"
            aria-label={isSafe ? '신호등: 안전, 초록불' : '신호등: 위험, 빨간불'}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px',
                borderRadius: '28px',
                backgroundColor: '#20242b',
                boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.12), 0 8px 18px rgba(15,23,42,0.2)',
            }}
        >
            {lamps.map((lamp) => (
                <span
                    key={lamp.label}
                    aria-hidden="true"
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: lamp.active ? lamp.color : '#454a53',
                        boxShadow: lamp.active ? `0 0 18px ${lamp.color}99, inset 0 2px 5px rgba(255,255,255,0.45)` : 'inset 0 2px 5px rgba(0,0,0,0.25)',
                        transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
                    }}
                />
            ))}
        </div>
    );
}
