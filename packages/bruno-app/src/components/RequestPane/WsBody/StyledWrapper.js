import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;

  .messages-container {
    flex: 1;
    display: flex;
    flex-direction: column;

    &.single {
      height: 100%;
    }

    &.multi {
      overflow-y: auto;
      padding-bottom: 48px;
    }
  }

  .message-container:hover + .insert-message-divider,
  .insert-message-divider:hover {
    .insert-message-btn {
      opacity: 1;
      pointer-events: auto;
      transform: scale(1);
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background-color: ${(props) => props.theme.requestTabPanel.url.border || '#e2e8f0'};
      z-index: -1;
    }
  }

  .insert-message-divider {
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;

    .insert-message-btn {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.95);
      transition: all 0.2s ease-in-out;

      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      color: ${(props) => props.theme.colors.text.primary || '#e9573f'} !important;
      background-color: ${(props) => props.theme.dropdown.hoverBg || '#fff'} !important;
      border: 1px solid ${(props) => props.theme.requestTabPanel.url.border || '#e2e8f0'} !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      cursor: pointer;

      &:hover {
        background-color: ${(props) => props.theme.colors.text.primary || '#e9573f'} !important;
        color: #fff !important;
        border-color: ${(props) => props.theme.colors.text.primary || '#e9573f'} !important;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;

    p {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 13px;
    }
  }

  .add-message-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: ${(props) => props.theme.bg};
  }
`;

export default Wrapper;
