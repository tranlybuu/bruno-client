import React, { createContext, useContext, useState } from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const TabsContext = createContext();

export const Tabs = ({ value: controlledValue, defaultValue, onValueChange, children, className = '' }) => {
  const isControlled = controlledValue !== undefined;
  const [localValue, setLocalValue] = useState(defaultValue);
  const activeValue = isControlled ? controlledValue : localValue;

  const handleValueChange = (newValue) => {
    if (!isControlled) {
      setLocalValue(newValue);
    }
    if (typeof onValueChange === 'function') {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <StyledWrapper className={`flex flex-col h-full flex-1 ${className}`}>{children}</StyledWrapper>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }) => {
  return <div className={`tabs-list ${className}`}>{children}</div>;
};

export const TabsTrigger = ({ value: triggerValue, children, className = '' }) => {
  const context = useContext(TabsContext);
  const { value, onValueChange } = context || {};
  const isActive = value === triggerValue;

  return (
    <button
      onClick={() => {
        if (typeof onValueChange === 'function') {
          onValueChange(triggerValue);
        }
      }}
      data-testid={`tab-trigger-${triggerValue}`}
      className={classnames('tab-trigger', className, { active: isActive })}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value: contentValue, children, className = '', dataTestId = '' }) => {
  const context = useContext(TabsContext);
  const { value } = context || {};
  const isActive = value === contentValue;

  return (
    <div
      className={`outline-none flex flex-col h-full flex-1 ${className}`}
      data-testid={dataTestId}
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {children}
    </div>
  );
};
