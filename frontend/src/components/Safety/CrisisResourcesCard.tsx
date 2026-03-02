import React, { useState } from 'react';
import { CrisisResource } from '../../services/safetyApi';

const FALLBACK_RESOURCES: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    type: 'hotline',
    contact: '988',
    description: 'Free, confidential crisis support 24/7 for people in suicidal crisis or mental health distress.',
    availability: '24/7',
  },
  {
    name: 'Crisis Text Line',
    type: 'text',
    contact: 'Text HOME to 741741',
    description: 'Free, confidential crisis counseling via text message.',
    availability: '24/7',
  },
  {
    name: '911 Emergency Services',
    type: 'emergency',
    contact: '911',
    description: 'For immediate life-threatening emergencies requiring police, fire, or medical response.',
    availability: '24/7',
  },
];

function getContactHref(resource: CrisisResource): string | null {
  if (resource.type === 'hotline' || resource.type === 'emergency') return `tel:${resource.contact}`;
  if (resource.type === 'text') return `sms:741741?body=HOME`;
  return null;
}

function mergeResources(apiResources: CrisisResource[]): CrisisResource[] {
  const seen = new Set<string>(FALLBACK_RESOURCES.map((r) => r.contact));
  const extras = apiResources.filter((r) => !seen.has(r.contact));
  return [...FALLBACK_RESOURCES, ...extras];
}

interface CopyButtonProps {
  contact: string;
  resourceName: string;
}

function CopyButton({ contact, resourceName }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contact);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = contact;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={`Copy contact information for ${resourceName}`}
      className="ml-2 px-2 py-0.5 text-xs font-medium rounded border border-amber-400 text-amber-800 hover:bg-amber-100 active:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 whitespace-nowrap"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface CrisisResourcesCardProps {
  resources?: CrisisResource[];
  compact?: boolean;
}

export function CrisisResourcesCard({ resources, compact = false }: CrisisResourcesCardProps) {
  const allResources = resources && resources.length > 0 ? mergeResources(resources) : FALLBACK_RESOURCES;

  if (compact) {
    return (
      <div
        className="bg-amber-50 border border-amber-200 rounded-lg p-4"
        role="region"
        aria-label="Crisis resources"
      >
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Crisis Resources</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {allResources.map((resource) => {
            const href = getContactHref(resource);
            return (
              <div key={resource.contact} className="flex items-center">
                <span className="text-sm font-medium text-amber-800">{resource.name}:</span>
                {href ? (
                  <a href={href} className="ml-1 text-sm text-amber-700 underline text-amber-800 hover:text-amber-900">{resource.contact}</a>
                ) : (
                  <span className="ml-1 text-sm text-amber-700">{resource.contact}</span>
                )}
                <CopyButton contact={resource.contact} resourceName={resource.name} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
      role="region"
      aria-label="Crisis resources"
    >
      <h3 className="text-base font-semibold text-amber-900 mb-3">Crisis Resources</h3>
      <div className="flex flex-col gap-3">
        {allResources.map((resource) => {
          const href = getContactHref(resource);
          return (
            <div
              key={resource.contact}
              className="bg-white border border-amber-100 rounded-md p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">{resource.name}</p>
                  <div className="flex items-center mt-0.5">
                    {href ? (
                      <a href={href} className="text-sm font-mono underline text-amber-800 hover:text-amber-900">{resource.contact}</a>
                    ) : (
                      <span className="text-sm text-amber-800 font-mono">{resource.contact}</span>
                    )}
                    <CopyButton contact={resource.contact} resourceName={resource.name} />
                  </div>
                  <p className="text-xs text-amber-700 mt-1">{resource.description}</p>
                </div>
                <span className="shrink-0 text-xs text-amber-600 bg-amber-100 rounded px-1.5 py-0.5">
                  {resource.availability}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
