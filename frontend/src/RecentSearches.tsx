interface RecentSearchesProps {
    foods: string[];
    onSelect: (food: string) => void;
}

export function RecentSearches({ foods, onSelect }: RecentSearchesProps) {
    if (foods.length === 0) return null;

    return (
        <div aria-label="최근 검색한 음식" style={{ marginTop: '12px', textAlign: 'left' }}>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>최근 검색</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {foods.map((food) => (
                    <button
                        key={food}
                        type="button"
                        onClick={() => onSelect(food)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            border: '1px solid #d1d5db',
                            backgroundColor: 'white',
                            color: '#374151',
                            cursor: 'pointer',
                        }}
                    >
                        {food}
                    </button>
                ))}
            </div>
        </div>
    );
}
