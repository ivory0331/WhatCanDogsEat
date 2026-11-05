export type MedicationKind = 'supplement' | 'medicine';
export type MedicationFrequency = 'daily' | 'weekly' | 'monthly';

export interface Medication {
    id: number;
    dog_id: number;
    name: string;
    kind: MedicationKind;
    dosage: string | null;
    frequency: MedicationFrequency;
    days_of_week: number[] | null; // 월=0 ~ 일=6
    day_of_month: number | null;
    memo: string | null;
    is_active: boolean;
}

export interface ChecklistItem {
    medication: Medication;
    taken: boolean;
}

// 등록/수정 시 서버로 보내는 데이터
export interface MedicationInput {
    name: string;
    kind: MedicationKind;
    dosage: string | null;
    frequency: MedicationFrequency;
    days_of_week: number[] | null;
    day_of_month: number | null;
    memo: string | null;
    is_active: boolean;
}

export const WEEKDAY_LABELS: readonly string[] = ['월', '화', '수', '목', '금', '토', '일'];

export const KIND_LABELS: Record<MedicationKind, string> = {
    supplement: '영양제',
    medicine: '약',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
    return value === null || value === undefined || typeof value === 'string';
}

export function isMedication(value: unknown): value is Medication {
    if (!isRecord(value)) return false;
    return (
        typeof value.id === 'number' &&
        typeof value.dog_id === 'number' &&
        typeof value.name === 'string' &&
        (value.kind === 'supplement' || value.kind === 'medicine') &&
        (value.frequency === 'daily' || value.frequency === 'weekly' || value.frequency === 'monthly') &&
        isNullableString(value.dosage) &&
        isNullableString(value.memo) &&
        (value.days_of_week === null || value.days_of_week === undefined ||
            (Array.isArray(value.days_of_week) && value.days_of_week.every((day) => typeof day === 'number'))) &&
        (value.day_of_month === null || value.day_of_month === undefined || typeof value.day_of_month === 'number') &&
        typeof value.is_active === 'boolean'
    );
}

export function isChecklistItem(value: unknown): value is ChecklistItem {
    return isRecord(value) && typeof value.taken === 'boolean' && isMedication(value.medication);
}

// 로컬 시간 기준 YYYY-MM-DD
export function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    return toDateKey(new Date(year, month - 1, day + days));
}

export function describeSchedule(medication: Medication): string {
    if (medication.frequency === 'weekly') {
        const days = (medication.days_of_week ?? []).map((day) => WEEKDAY_LABELS[day]).join('·');
        return `매주 ${days}`;
    }
    if (medication.frequency === 'monthly') {
        return `매월 ${medication.day_of_month ?? '-'}일`;
    }
    return '매일';
}
