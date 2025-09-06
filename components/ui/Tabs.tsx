'use client';

import React, { useState, createContext, useContext, ReactNode } from 'react';

interface TabsContextProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextProps | null>(null);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a Tabs provider');
  }
  return context;
};

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
}

export const Tabs = ({ defaultValue, children }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export const TabsList = ({ children, className = '' }: TabsListProps) => {
  return (
    <div className={`flex border-b border-slate-200 overflow-x-auto ${className}`}>
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  icon?: React.ReactNode;
}

export const TabsTrigger = ({ value, children, icon }: TabsTriggerProps) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      role="tab"
      aria-selected={isActive}
      className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap
        ${
          isActive
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: ReactNode;
}

export const TabsContent = ({ value, children }: TabsContentProps) => {
  const { activeTab } = useTabs();
  return activeTab === value ? <div className="py-6">{children}</div> : null;
};
