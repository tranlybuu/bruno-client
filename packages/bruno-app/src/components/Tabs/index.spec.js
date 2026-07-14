import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './index';

const mockTheme = {
  tabs: {
    secondary: {
      active: {
        bg: '#fff',
        color: '#000'
      },
      inactive: {
        bg: '#f5f5f5',
        color: '#555'
      }
    }
  }
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('Tabs Component', () => {
  it('should render children and support uncontrolled mode with defaultValue', () => {
    renderWithTheme(
      <Tabs defaultValue="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    // Tab 2 content should be visible, Tab 1 should not (its display should be 'none')
    const content1 = screen.getByText('Content 1');
    const content2 = screen.getByText('Content 2');

    expect(content1).toHaveStyle({ display: 'none' });
    expect(content2).toHaveStyle({ display: 'flex' });

    // Click Tab 1
    fireEvent.click(screen.getByText('Tab 1'));

    expect(content1).toHaveStyle({ display: 'flex' });
    expect(content2).toHaveStyle({ display: 'none' });
  });

  it('should support controlled mode with value and onValueChange', () => {
    const onValueChange = jest.fn();

    renderWithTheme(
      <Tabs value="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    const content1 = screen.getByText('Content 1');
    const content2 = screen.getByText('Content 2');

    expect(content1).toHaveStyle({ display: 'flex' });
    expect(content2).toHaveStyle({ display: 'none' });

    // Click Tab 2 - should call onValueChange but since it is controlled, value remains tab1
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onValueChange).toHaveBeenCalledWith('tab2');

    // The UI shouldn't update automatically because it's controlled and the value prop did not change
    expect(content1).toHaveStyle({ display: 'flex' });
    expect(content2).toHaveStyle({ display: 'none' });
  });

  it('should not throw errors if context is missing or handlers are not functions', () => {
    // Render Trigger outside of Tabs provider to ensure context safety
    expect(() => {
      renderWithTheme(<TabsTrigger value="tab1">Isolated Trigger</TabsTrigger>);
    }).not.toThrow();

    // Click trigger and ensure it doesn't throw
    fireEvent.click(screen.getByText('Isolated Trigger'));

    // Render Content outside of Tabs provider
    expect(() => {
      renderWithTheme(<TabsContent value="tab1">Isolated Content</TabsContent>);
    }).not.toThrow();
  });
});
