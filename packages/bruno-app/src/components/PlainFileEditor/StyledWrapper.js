import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  width: 100%;

  .raw-editor-container {
    height: 100%;
    width: 100%;
  }

  &.dragging {
    cursor: col-resize;
    user-select: none;
  }

  div.dragbar-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    min-width: 12px;
    padding: 0;
    cursor: col-resize;
    background: transparent;
    position: relative;
    user-select: none;

    div.dragbar-handle {
      display: flex;
      height: 100%;
      width: 1px;
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.border};
      pointer-events: none;
    }

    &:hover div.dragbar-handle {
      border-left: solid 1px ${(props) => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }
`;

export default StyledWrapper;
