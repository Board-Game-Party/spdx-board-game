import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { fetchApi } from '../../lib/api';

export interface ScoreOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  side: 'GROUP' | 'INDIVIDUAL';
  itemId: string;
  itemName: string;
  currentScore: number;
  onSuccess: () => void;
}

export const ScoreOverrideModal: React.FC<ScoreOverrideModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  side,
  itemId,
  itemName,
  currentScore,
  onSuccess,
}) => {
  const [overrideValue, setOverrideValue] = useState(currentScore);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('จำเป็นต้องระบุเหตุผลในการ Override คะแนน');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await fetchApi(`/assignments/${assignmentId}/scores:override`, {
        method: 'POST',
        body: JSON.stringify({
          side,
          item_id: itemId,
          override_value: Number(overrideValue),
          reason: reason.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to override score');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Override คะแนน: ${itemName} (${side})`}>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && <Alert type="error">{error}</Alert>}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p className="font-semibold text-slate-700">รายการ: {itemName}</p>
          <p className="text-slate-500">คะแนนปัจจุบันจากการคำนวณ: {currentScore.toFixed(3)}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">คะแนนใหม่ที่ต้องการกำหนด (New Score)</label>
          <input
            type="number"
            step="0.01"
            required
            value={overrideValue}
            onChange={(e) => setOverrideValue(Number(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">เหตุผลประกอบการ Override (Mandatory Reason)</label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ระบุเหตุผล เช่น ปรับตามข้อเท็จจริงจากการตรวจงานสด หรือคำร้องอุทธรณ์..."
            className="mt-1 block w-full p-2.5 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            บันทึกการ Override
          </Button>
        </div>
      </form>
    </Modal>
  );
};
