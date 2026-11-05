import { useCallback, useEffect, useState } from 'react';
import { isChecklistItem, isMedication } from './medicationTypes';
import type { ChecklistItem, Medication, MedicationInput } from './medicationTypes';
import { API_BASE_URL } from './apiConfig';

interface LoadedData {
    key: string;
    medications: Medication[];
    checklist: ChecklistItem[];
    error: string | null;
}

export interface UseMedicationsResult {
    medications: Medication[];
    checklist: ChecklistItem[];
    loading: boolean;
    error: string | null;
    actionError: string | null;
    toggleTaken: (medicationId: number, taken: boolean) => Promise<void>;
    saveMedication: (input: MedicationInput, medicationId?: number) => Promise<boolean>;
    deleteMedication: (medicationId: number) => Promise<boolean>;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    if (response.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.';
    try {
        const body: unknown = await response.json();
        if (typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string') {
            return body.detail;
        }
    } catch {
        // JSON이 아닌 응답은 기본 메시지 사용
    }
    return fallback;
}

export function useMedications(dogId: number | undefined, token: string | null, dateKey: string): UseMedicationsResult {
    const requestKey = dogId !== undefined && token ? `${dogId}:${dateKey}` : null;
    const [data, setData] = useState<LoadedData | null>(null);
    const [reloadCount, setReloadCount] = useState(0);
    const [actionError, setActionError] = useState<string | null>(null);

    const authHeaders = useCallback((): Record<string, string> => ({
        Authorization: `Bearer ${token ?? ''}`,
    }), [token]);

    useEffect(() => {
        if (requestKey === null || dogId === undefined) return;
        let cancelled = false;

        const load = async (): Promise<void> => {
            try {
                const [medsResponse, checklistResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/dogs/${dogId}/medications`, { headers: authHeaders() }),
                    fetch(`${API_BASE_URL}/api/dogs/${dogId}/checklist?date=${dateKey}`, { headers: authHeaders() }),
                ]);
                if (!medsResponse.ok || !checklistResponse.ok) {
                    const failed = medsResponse.ok ? checklistResponse : medsResponse;
                    throw new Error(await readErrorMessage(failed, '복용 정보를 불러오지 못했습니다.'));
                }
                const medsBody: unknown = await medsResponse.json();
                const checklistBody: unknown = await checklistResponse.json();
                if (cancelled) return;
                setData({
                    key: requestKey,
                    medications: Array.isArray(medsBody) ? medsBody.filter(isMedication) : [],
                    checklist: Array.isArray(checklistBody) ? checklistBody.filter(isChecklistItem) : [],
                    error: null,
                });
            } catch (error) {
                if (cancelled) return;
                setData({
                    key: requestKey,
                    medications: [],
                    checklist: [],
                    error: error instanceof Error ? error.message : '복용 정보를 불러오지 못했습니다.',
                });
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [requestKey, dogId, dateKey, authHeaders, reloadCount]);

    const current = data !== null && data.key === requestKey ? data : null;

    const toggleTaken = useCallback(async (medicationId: number, taken: boolean): Promise<void> => {
        if (!token) return;
        setActionError(null);
        const applyTaken = (value: boolean): void => {
            setData((prev) => prev && {
                ...prev,
                checklist: prev.checklist.map((item) =>
                    item.medication.id === medicationId ? { ...item, taken: value } : item),
            });
        };

        applyTaken(taken); // 낙관적 업데이트
        try {
            const response = await fetch(`${API_BASE_URL}/api/medications/${medicationId}/logs/${dateKey}`, {
                method: taken ? 'PUT' : 'DELETE',
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error(await readErrorMessage(response, '체크 상태를 저장하지 못했습니다.'));
        } catch (error) {
            applyTaken(!taken); // 실패 시 되돌리기
            setActionError(error instanceof Error ? error.message : '체크 상태를 저장하지 못했습니다.');
        }
    }, [token, dateKey, authHeaders]);

    const saveMedication = useCallback(async (input: MedicationInput, medicationId?: number): Promise<boolean> => {
        if (!token || dogId === undefined) return false;
        setActionError(null);
        try {
            const url = medicationId === undefined
                ? `${API_BASE_URL}/api/dogs/${dogId}/medications`
                : `${API_BASE_URL}/api/medications/${medicationId}`;
            const response = await fetch(url, {
                method: medicationId === undefined ? 'POST' : 'PUT',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
            if (!response.ok) throw new Error(await readErrorMessage(response, '저장 중 오류가 발생했습니다.'));
            setReloadCount((count) => count + 1);
            return true;
        } catch (error) {
            setActionError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
            return false;
        }
    }, [token, dogId, authHeaders]);

    const deleteMedication = useCallback(async (medicationId: number): Promise<boolean> => {
        if (!token) return false;
        setActionError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/medications/${medicationId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            if (!response.ok) throw new Error(await readErrorMessage(response, '삭제 중 오류가 발생했습니다.'));
            setReloadCount((count) => count + 1);
            return true;
        } catch (error) {
            setActionError(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
            return false;
        }
    }, [token, authHeaders]);

    return {
        medications: current?.medications ?? [],
        checklist: current?.checklist ?? [],
        loading: requestKey !== null && current === null,
        error: current?.error ?? null,
        actionError,
        toggleTaken,
        saveMedication,
        deleteMedication,
    };
}
