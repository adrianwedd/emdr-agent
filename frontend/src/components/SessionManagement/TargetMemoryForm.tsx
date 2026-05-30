import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../Common/Input';
import { Button } from '../Common/Button';
import { SUDScale } from './SUDScale';
import { VOCScale } from './VOCScale';

const targetMemorySchema = z.object({
  description: z.string().min(10, 'Please describe the memory in at least 10 characters'),
  negativeCognition: z.string().min(3, 'Required — e.g., "I am not safe"'),
  positiveCognition: z.string().min(3, 'Required — e.g., "I am safe now"'),
  emotion: z.string().min(2, 'What emotion comes up?'),
  bodyLocation: z.string().optional(),
});

type TargetMemoryFormData = z.infer<typeof targetMemorySchema>;

interface TargetMemoryFormProps {
  onSubmit: (data: TargetMemoryFormData & { initialSUD: number; initialVOC: number }) => void;
  isLoading?: boolean;
}

export const TargetMemoryForm: React.FC<TargetMemoryFormProps> = ({ onSubmit, isLoading }) => {
  const [initialSUD, setInitialSUD] = useState<number | undefined>(undefined);
  const [initialVOC, setInitialVOC] = useState<number | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TargetMemoryFormData>({
    resolver: zodResolver(targetMemorySchema),
  });

  const onFormSubmit = (data: TargetMemoryFormData) => {
    if (initialSUD === undefined || initialVOC === undefined) return;
    onSubmit({ ...data, initialSUD, initialVOC });
  };

  const canSubmit = initialSUD !== undefined && initialVOC !== undefined;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Target Memory</h3>
        <div>
          <label htmlFor="memory-description" className="block text-sm font-medium text-gray-700 mb-1">Describe the memory or image</label>
          <textarea
            id="memory-description"
            {...register('description')}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-therapy-accent focus:border-therapy-accent"
            rows={3}
            placeholder="Describe the disturbing memory or image..."
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <Input label="Negative Cognition" placeholder='e.g., "I am not safe" or "I am powerless"' error={errors.negativeCognition?.message} {...register('negativeCognition')} />
        <Input label="Positive Cognition (desired belief)" placeholder='e.g., "I am safe now" or "I have choices"' error={errors.positiveCognition?.message} {...register('positiveCognition')} />
        <Input label="Primary Emotion" placeholder="e.g., fear, shame, sadness" error={errors.emotion?.message} {...register('emotion')} />
        <Input label="Body Location (optional)" placeholder="Where do you feel it in your body?" {...register('bodyLocation')} />
      </div>
      <div className="border-t border-gray-200 pt-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Initial Measurements</h3>
        <SUDScale value={initialSUD} onChange={setInitialSUD} label="Current Distress Level (SUD)" />
        <VOCScale value={initialVOC} onChange={setInitialVOC} label="How true does the positive cognition feel?" cognition="(your positive cognition above)" />
      </div>
      <div className="pt-4">
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!canSubmit} loading={isLoading}>
          Begin Session
        </Button>
        {!canSubmit && (
          <p className="mt-2 text-sm text-therapy-muted text-center">Please select both SUD and VOC levels to continue</p>
        )}
      </div>
    </form>
  );
};
