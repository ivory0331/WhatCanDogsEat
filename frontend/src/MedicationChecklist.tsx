import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useDogStore } from './store';
import { useMedications } from './useMedications';
import { MedicationForm } from './MedicationForm';
import { KIND_LABELS, WEEKDAY_LABELS, describeSchedule, shiftDateKey, toDateKey } from './medicationTypes';
import type { Medication, MedicationInput } from './medicationTypes';

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; medication: Medication };

const navButtonStyle: React.CSSProperties = {
    padding: '6px 12px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer',
};

function formatDateLabel(dateKey: string, todayKey: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const weekday = WEEKDAY_LABELS[(new Date(year, month - 1, day).getDay() + 6) % 7];
    const base = `${month}월 ${day}일 (${weekday})`;
    if (dateKey === todayKey) return `오늘 · ${base}`;
    if (dateKey === shiftDateKey(todayKey, -1)) return `어제 · ${base}`;
    return base;
}

function KindBadge({ medication }: { medication: Medication }) {
    const isMedicine = medication.kind === 'medicine';
    return (
        <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
            backgroundColor: isMedicine ? '#fef2f2' : '#f0fdf4',
            color: isMedicine ? '#b91c1c' : '#15803d',
        }}>
            {isMedicine ? '💊' : '🌿'} {KIND_LABELS[medication.kind]}
        </span>
    );
}

export function MedicationChecklist() {
    const token = useAuthStore((state) => state.token);
    const dogs = useDogStore((state) => state.dogs);
    const storedSelectedDog = useDogStore((state) => state.selectedDog);
    const setSelectedDog = useDogStore((state) => state.setSelectedDog);

    // 선택된 강아지가 없으면 첫 번째 강아지를 기본으로 사용
    const selectedDog = storedSelectedDog ?? dogs[0] ?? null;

    const todayKey = toDateKey(new Date());
    const [dateKey, setDateKey] = useState(todayKey);
    const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });

    const {
        medications, checklist, loading, error, actionError, toggleTaken, saveMedication, deleteMedication,
    } = useMedications(selectedDog?.id, token, dateKey);

    if (!token) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p>복용 체크리스트는 로그인 후 이용할 수 있어요.</p>
                <Link to="/auth" style={{ color: '#3b82f6', fontWeight: 'bold' }}>로그인하러 가기</Link>
            </div>
        );
    }

    if (!selectedDog) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p>먼저 강아지를 등록해주세요 🐶</p>
                <Link to="/signup" state={{ dogToEdit: null }} style={{ color: '#3b82f6', fontWeight: 'bold' }}>강아지 등록하기</Link>
            </div>
        );
    }

    const takenCount = checklist.filter((item) => item.taken).length;
    const isFutureDate = dateKey > todayKey;

    const handleSubmit = async (input: MedicationInput): Promise<boolean> => {
        const ok = await saveMedication(input, editor.mode === 'edit' ? editor.medication.id : undefined);
        if (ok) setEditor({ mode: 'closed' });
        return ok;
    };

    const handleDelete = async (medication: Medication): Promise<void> => {
        if (!window.confirm(`'${medication.name}'을(를) 삭제할까요? 복용 기록도 함께 삭제됩니다.`)) return;
        await deleteMedication(medication.id);
    };

    return (
        <div style={{ padding: '20px 20px 40px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '26px' }}>💊 복용 체크리스트</h1>

            {/* 강아지 선택 */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', margin: '20px 0' }}>
                {dogs.map((dog) => (
                    <button
                        key={dog.id}
                        type="button"
                        onClick={() => {
                            setSelectedDog(dog);
                            setEditor({ mode: 'closed' });
                        }}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: selectedDog.id === dog.id ? '2px solid #3b82f6' : '1px solid #ccc',
                            backgroundColor: selectedDog.id === dog.id ? '#eff6ff' : 'white',
                            fontWeight: selectedDog.id === dog.id ? 'bold' : 'normal',
                            cursor: 'pointer',
                        }}
                    >
                        {dog.name}
                    </button>
                ))}
            </div>

            {/* 날짜 이동 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                <button type="button" aria-label="이전 날짜" onClick={() => setDateKey(shiftDateKey(dateKey, -1))} style={navButtonStyle}>◀</button>
                <div style={{ textAlign: 'center' }}>
                    <strong>{formatDateLabel(dateKey, todayKey)}</strong>
                    {dateKey !== todayKey && (
                        <button type="button" onClick={() => setDateKey(todayKey)} style={{ ...navButtonStyle, marginLeft: '8px', fontSize: '12px', padding: '3px 8px' }}>
                            오늘로
                        </button>
                    )}
                </div>
                <button type="button" aria-label="다음 날짜" onClick={() => setDateKey(shiftDateKey(dateKey, 1))} style={navButtonStyle}>▶</button>
            </div>

            {actionError && <p role="alert" style={{ color: '#dc2626', textAlign: 'center' }}>{actionError}</p>}

            {/* 오늘의 체크리스트 */}
            <section aria-label="복용 체크리스트" style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', backgroundColor: '#f9fafb' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#666' }}>불러오는 중이에요 🐾...</p>
                ) : error ? (
                    <p role="alert" style={{ textAlign: 'center', color: '#dc2626' }}>{error}</p>
                ) : checklist.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666' }}>
                        {medications.length === 0
                            ? `${selectedDog.name}에게 등록된 약·영양제가 없어요.`
                            : '이 날은 먹어야 할 약·영양제가 없어요 🎉'}
                    </p>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ color: '#374151' }}>{selectedDog.name}의 복용 현황</span>
                            <strong style={{ color: takenCount === checklist.length ? '#16a34a' : '#3b82f6' }}>
                                {takenCount}/{checklist.length} 완료{takenCount === checklist.length ? ' ✅' : ''}
                            </strong>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {checklist.map(({ medication, taken }) => (
                                <li key={medication.id}>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                                        borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: 'white',
                                        cursor: isFutureDate ? 'not-allowed' : 'pointer', opacity: taken ? 0.7 : 1,
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={taken}
                                            disabled={isFutureDate}
                                            onChange={(e) => void toggleTaken(medication.id, e.target.checked)}
                                            style={{ width: '20px', height: '20px', accentColor: '#3b82f6' }}
                                        />
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <strong style={{ textDecoration: taken ? 'line-through' : 'none' }}>{medication.name}</strong>
                                                {medication.dosage && <span style={{ color: '#666', fontSize: '14px' }}>{medication.dosage}</span>}
                                                <KindBadge medication={medication} />
                                            </div>
                                            {medication.memo && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>{medication.memo}</p>}
                                        </div>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        {isFutureDate && <p style={{ fontSize: '13px', color: '#666', marginBottom: 0 }}>미래 날짜는 미리 볼 수만 있어요.</p>}
                    </>
                )}
            </section>

            {/* 추가/수정 폼 */}
            <div style={{ marginTop: '24px' }}>
                {editor.mode === 'closed' ? (
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + 약·영양제 추가하기
                    </button>
                ) : (
                    <MedicationForm
                        key={editor.mode === 'edit' ? editor.medication.id : 'new'}
                        initial={editor.mode === 'edit' ? editor.medication : null}
                        onSubmit={handleSubmit}
                        onCancel={() => setEditor({ mode: 'closed' })}
                    />
                )}
            </div>

            {/* 전체 목록 관리 */}
            {medications.length > 0 && (
                <section aria-label="등록된 약·영양제" style={{ marginTop: '28px' }}>
                    <h2 style={{ fontSize: '18px' }}>등록된 약·영양제 ({medications.length})</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {medications.map((medication) => (
                            <li key={medication.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0',
                                borderBottom: '1px solid #eee', opacity: medication.is_active ? 1 : 0.5,
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <strong>{medication.name}</strong>
                                        <KindBadge medication={medication} />
                                        {!medication.is_active && <span style={{ fontSize: '12px', color: '#666' }}>(복용 중지)</span>}
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                                        {describeSchedule(medication)}{medication.dosage ? ` · ${medication.dosage}` : ''}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setEditor({ mode: 'edit', medication })} style={{ ...navButtonStyle, fontSize: '12px' }}>✏️ 수정</button>
                                <button type="button" onClick={() => void handleDelete(medication)} style={{ ...navButtonStyle, fontSize: '12px', color: '#dc2626' }}>삭제</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
