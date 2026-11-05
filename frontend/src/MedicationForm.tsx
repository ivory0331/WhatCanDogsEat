import { useState } from 'react';
import { KIND_LABELS, WEEKDAY_LABELS } from './medicationTypes';
import type { Medication, MedicationFrequency, MedicationInput, MedicationKind } from './medicationTypes';

interface MedicationFormProps {
    initial: Medication | null;
    onSubmit: (input: MedicationInput) => Promise<boolean>;
    onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', padding: '10px', marginTop: '5px',
    borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box',
};

const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
    daily: '매일',
    weekly: '매주 (요일 선택)',
    monthly: '매월 (날짜 선택)',
};

export function MedicationForm({ initial, onSubmit, onCancel }: MedicationFormProps) {
    const [name, setName] = useState(initial?.name ?? '');
    const [kind, setKind] = useState<MedicationKind>(initial?.kind ?? 'supplement');
    const [dosage, setDosage] = useState(initial?.dosage ?? '');
    const [frequency, setFrequency] = useState<MedicationFrequency>(initial?.frequency ?? 'daily');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.days_of_week ?? []);
    const [dayOfMonth, setDayOfMonth] = useState(String(initial?.day_of_month ?? 1));
    const [memo, setMemo] = useState(initial?.memo ?? '');
    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const toggleDay = (day: number): void => {
        setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        const trimmedName = name.trim();
        const parsedDay = Number(dayOfMonth);

        if (!trimmedName) {
            setFormError('이름을 입력해주세요.');
            return;
        }
        if (frequency === 'weekly' && daysOfWeek.length === 0) {
            setFormError('요일을 하나 이상 선택해주세요.');
            return;
        }
        if (frequency === 'monthly' && (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)) {
            setFormError('날짜는 1~31 사이로 입력해주세요.');
            return;
        }

        setFormError(null);
        setSubmitting(true);
        await onSubmit({
            name: trimmedName,
            kind,
            dosage: dosage.trim() || null,
            frequency,
            days_of_week: frequency === 'weekly' ? daysOfWeek : null,
            day_of_month: frequency === 'monthly' ? parsedDay : null,
            memo: memo.trim() || null,
            is_active: isActive,
        });
        setSubmitting(false);
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left',
                padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb',
            }}
        >
            <h3 style={{ margin: 0 }}>{initial ? '✏️ 약·영양제 수정' : '➕ 약·영양제 추가'}</h3>

            <label>
                이름
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 관절 영양제, 심장사상충약" maxLength={100} required style={inputStyle} />
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ flex: 1 }}>
                    종류
                    <select value={kind} onChange={(e) => setKind(e.target.value === 'medicine' ? 'medicine' : 'supplement')} style={inputStyle}>
                        {(Object.keys(KIND_LABELS) as MedicationKind[]).map((key) => (
                            <option key={key} value={key}>{KIND_LABELS[key]}</option>
                        ))}
                    </select>
                </label>
                <label style={{ flex: 1 }}>
                    용량 (선택)
                    <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="예: 1알, 2ml" maxLength={50} style={inputStyle} />
                </label>
            </div>

            <label>
                복용 주기
                <select
                    value={frequency}
                    onChange={(e) => {
                        const value = e.target.value;
                        setFrequency(value === 'weekly' || value === 'monthly' ? value : 'daily');
                    }}
                    style={inputStyle}
                >
                    {(Object.keys(FREQUENCY_LABELS) as MedicationFrequency[]).map((key) => (
                        <option key={key} value={key}>{FREQUENCY_LABELS[key]}</option>
                    ))}
                </select>
            </label>

            {frequency === 'weekly' && (
                <div role="group" aria-label="복용 요일" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {WEEKDAY_LABELS.map((label, day) => {
                        const selected = daysOfWeek.includes(day);
                        return (
                            <button
                                key={label}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleDay(day)}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
                                    border: selected ? '2px solid #3b82f6' : '1px solid #ccc',
                                    backgroundColor: selected ? '#eff6ff' : 'white',
                                    fontWeight: selected ? 'bold' : 'normal',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {frequency === 'monthly' && (
                <label>
                    매월 며칠? (말일보다 크면 그 달 마지막 날)
                    <input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} style={inputStyle} />
                </label>
            )}

            <label>
                메모 (선택)
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 식후에 급여, 사료에 섞어서" maxLength={300} style={{ ...inputStyle, height: '60px' }} />
            </label>

            {initial && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    복용 중 (끄면 체크리스트에서 숨겨져요)
                </label>
            )}

            {formError && <p role="alert" style={{ color: '#dc2626', margin: 0 }}>{formError}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={onCancel} style={{ flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                    취소
                </button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                    {submitting ? '저장 중...' : '저장하기'}
                </button>
            </div>
        </form>
    );
}
