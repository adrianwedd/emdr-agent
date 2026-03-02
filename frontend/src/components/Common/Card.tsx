import React from 'react';

interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, footer, className = '', children }) => {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {header && <div className="px-6 py-4 border-b border-gray-200">{header}</div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-gray-200">{footer}</div>}
    </div>
  );
};
