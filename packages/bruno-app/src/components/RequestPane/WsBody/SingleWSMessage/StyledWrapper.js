import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  &.single {
    height: 100%;

    .editor-container {
      height: calc(100% - 32px) !important;
      min-height: 0 !important;
      max-height: none !important;

      .graphiql-container {
        height: 100% !important;
        min-height: 0 !important;
        max-height: none !important;

        .editor-container {
          height: 100% !important;
          min-height: 0 !important;
          max-height: none !important;

          .CodeMirror {
            height: 100% !important;
            min-height: 0 !important;
            max-height: none !important;

            .CodeMirror-scroll {
              height: 100% !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: auto !important;
            }
          }
        }
      }
    }
  }

  &:not(.single) {
    border: 1px solid ${(props) => props.theme.requestTabPanel.url.border || '#e2e8f0'};
    border-radius: 6px;
    background-color: ${(props) => props.theme.background.surface0 || '#f9f9f9'};
    padding: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .message-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 4px 0px;
    padding-top: 0px;
    height: 32px;
    flex-shrink: 0;

    .message-label {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.subtext1};
      margin-right: auto;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      transition: all 0.15s ease;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
        color: ${(props) => props.theme.text};
      }

      &.delete:hover {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }



  .editor-container {
    position: relative;
    width: 100%;
    height: auto;
    min-height: 150px;
    max-height: 460px;

    .graphiql-container {
      height: auto !important;
      min-height: 150px !important;
      max-height: 460px !important;

      .editor-container {
        height: auto !important;
        min-height: 150px !important;
        max-height: 460px !important;

        .CodeMirror {
          height: auto !important;
          min-height: 150px !important;
          max-height: 460px !important;
          flex: none !important;

          .CodeMirror-scroll {
            height: auto !important;
            min-height: 150px !important;
            max-height: 460px !important;
            overflow: auto !important;
          }
        }
      }
    }
  }

  .editor-floating-actions {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 6px;
    background-color: ${(props) => props.theme.background.surface0 || '#f9f9f9'};
    border: 1px solid ${(props) => props.theme.requestTabPanel.url.border || '#e2e8f0'};
    border-radius: 4px;
    padding: 2px 6px;
    opacity: 0.85;
    transition: opacity 0.2s ease-in-out;

    &:hover {
      opacity: 1;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      transition: all 0.15s ease;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
        color: ${(props) => props.theme.text};
      }
    }
  }
`;

export default StyledWrapper;
