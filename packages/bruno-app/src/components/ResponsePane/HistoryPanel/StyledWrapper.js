import styled from 'styled-components';

const StyledWrapper = styled.div`
  .history-item {
    border: 1px solid ${(props) => props.theme.colors.border || 'var(--color-border)'};
    background-color: ${(props) => props.theme.colors.bg || 'var(--color-bg)'};
    
    &:hover {
      background-color: ${(props) => props.theme.colors.bg.hover || 'rgba(0, 0, 0, 0.02)'};
    }

    &.active {
      background-color: ${(props) => props.theme.colors.bg.active || 'rgba(0, 0, 0, 0.05)'};
      border-color: ${(props) => props.theme.colors.primary || '#e57e23'};
    }
  }

  .url-text {
    color: ${(props) => props.theme.colors.text.default || 'inherit'};
  }

  .check-icon {
    color: ${(props) => props.theme.colors.primary || '#e57e23'};
  }

  .status-success {
    color: ${(props) => props.theme.colors.text.green || '#10b981'};
  }

  .status-redirect {
    color: ${(props) => props.theme.colors.text.yellow || '#f59e0b'};
  }

  .status-error {
    color: ${(props) => props.theme.colors.text.danger || '#ef4444'};
  }

  .method-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    color: white;

    &.method-get {
      background-color: #10b981;
    }
    &.method-post {
      background-color: #8b5cf6;
    }
    &.method-put {
      background-color: #3b82f6;
    }
    &.method-delete {
      background-color: #ef4444;
    }
    &.method-patch {
      background-color: #f59e0b;
    }
    &.method-head {
      background-color: #6b7280;
    }
    &.method-options {
      background-color: #6b7280;
    }
  }
`;

export default StyledWrapper;
