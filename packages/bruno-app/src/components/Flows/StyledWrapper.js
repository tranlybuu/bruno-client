import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.colors.bg.default || '#ffffff'};
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 16px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    flex-shrink: 0;
  }
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .toolbar-title {
    font-size: 13px;
    font-weight: 700;
    color: ${(props) => props.theme.colors.text.default || '#111827'};
  }
  .toolbar-count {
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    background: ${(props) => props.theme.colors.bg.default || '#f3f4f6'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 12px;
    padding: 1px 8px;
  }
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.12s;
    &:disabled { opacity: 0.45; cursor: not-allowed; }
  }
  .btn-ghost {
    background: transparent;
    border-color: ${(props) => props.theme.colors.border || '#e5e7eb'};
    color: ${(props) => props.theme.colors.text.default || '#374151'};
    &:hover:not(:disabled) { background: ${(props) => props.theme.colors.bg.default || '#f3f4f6'}; }
  }
  .btn-primary {
    background: #16a34a;
    border-color: #15803d;
    color: #fff;
    &:hover:not(:disabled) { background: #15803d; }
  }
  kbd {
    font-size: 10px; font-family: monospace; font-weight: 700;
    padding: 1px 4px; border-radius: 3px;
    background: rgba(0,0,0,0.07); border: 1px solid rgba(0,0,0,0.14); margin-left: 2px;
  }

  /* ── Body ── */
  .body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* ── List panel ── */
  .list-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
    transition: flex 0.2s ease;
    position: relative;
    &.with-panel { flex: 0 0 380px; border-right: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'}; }
  }
  .list-panel-resize-handle {
    position: absolute;
    top: 0;
    right: -4px;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    &::after {
      content: '';
      display: block;
      width: 3px;
      height: 40px;
      border-radius: 3px;
      background: transparent;
      transition: background 0.15s, box-shadow 0.15s;
    }
    &:hover::after, &:active::after {
      background: #6366f1;
      box-shadow: 0 0 6px rgba(99,102,241,0.4);
    }
  }
  .list-header {
    display: grid;
    grid-template-columns: 40px 32px 36px 70px 1fr 28px 28px 40px;
    align-items: center;
    gap: 0;
    padding: 6px 16px 6px 16px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-left: 3px solid transparent;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    flex-shrink: 0;
    & > span:nth-child(2) {
      display: flex;
      justify-content: center;
    }
  }
  .list-body {
    flex: 1;
    overflow-y: auto;
  }
  .step-row {
    display: grid;
    grid-template-columns: 40px 32px 36px 70px 1fr 28px 28px 40px;
    align-items: center;
    gap: 0;
    padding: 0 16px;
    height: 42px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#f3f4f6'};
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    position: relative;
    user-select: none;
    &:hover { background: ${(props) => props.theme.colors.bg.hover || '#f8fafc'}; }
    &.selected {
      background: ${(props) => props.theme.colors.bg.hover || '#f0f7ff'};
      border-left-color: #6366f1;
    }
  }
  .row-num {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    text-align: right;
    padding-right: 8px;
    font-variant-numeric: tabular-nums;
  }
  .row-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .checkbox {
    width: 16px; height: 16px;
    border-radius: 4px;
    border: 2px solid #d1d5db;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.1s;
    flex-shrink: 0;
    &.checked { background: #3b82f6; border-color: #3b82f6; }
    svg { display: block; }
  }
  .row-method {
    display: flex;
    align-items: center;
  }
  .method-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.2px;
    white-space: nowrap;
    color: #fff;
    &.GET    { background: #2563eb; }
    &.POST   { background: #16a34a; }
    &.PUT    { background: #d97706; }
    &.PATCH  { background: #ea580c; }
    &.DELETE { background: #dc2626; }
    &.HEAD   { background: #7c3aed; }
    &.OPTIONS { background: #6b7280; }
    &.EMPTY  { background: #9ca3af; }
  }
  .row-name {
    font-size: 13px;
    color: ${(props) => props.theme.colors.text.default || '#111827'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 10px;
    &.disabled { color: ${(props) => props.theme.colors.text.muted || '#9ca3af'}; text-decoration: line-through; }
  }
  .row-arrows {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 100%;
  }
  .arrow-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1px;
    border-radius: 3px;
    border: 1px solid transparent;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    cursor: pointer;
    transition: all 0.1s;
    &:hover:not(:disabled) {
      background: ${(props) => props.theme.colors.bg.default || '#e5e7eb'};
      color: ${(props) => props.theme.colors.text.default || '#111827'};
    }
    &:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }
  }

  .row-delete-col {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    &:hover { color: #ef4444; }
  }
  .row-play-col {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    &:hover { color: #10b981; }
  }
  .step-row:hover .row-delete-col,
  .step-row:hover .row-play-col { opacity: 1; }

  /* Running states */
  .step-row.state-running { border-left-color: #3b82f6; background: #eff6ff; animation: rowPulse 1.2s infinite; }
  .step-row.state-success { border-left-color: #16a34a; }
  .step-row.state-fail    { border-left-color: #dc2626; background: #fef2f2; }
  @keyframes rowPulse {
    0%, 100% { background: #eff6ff; }
    50% { background: #dbeafe; }
  }

  .row-status-col {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
  }

  /* ── Add step row ── */
  .add-step-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 10px 50px;
    font-size: 12px;
    font-weight: 600;
    color: #6366f1;
    cursor: pointer;
    border-top: 1px dashed ${(props) => props.theme.colors.border || '#e5e7eb'};
    transition: background 0.1s;
    &:hover { background: #f5f3ff; }
  }

  /* ── Config panel ── */
  .config-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .config-header {
    padding: 14px 20px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    flex-shrink: 0;
  }
  .config-title {
    font-size: 13px;
    font-weight: 700;
    color: ${(props) => props.theme.colors.text.default || '#111827'};
    margin-bottom: 6px;
  }
  .config-api-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 6px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    cursor: pointer;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
    transition: all 0.12s;
    width: 100%;
    text-align: left;
    &:hover { border-color: #6366f1; color: #6366f1; }
  }
  .config-api-url {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    padding: 4px 8px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border-radius: 5px;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
  }
  .api-url-text {
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .config-tabs {
    display: flex;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    padding: 0 20px;
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    flex-shrink: 0;
  }
  .config-tab {
    padding: 9px 14px;
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.12s;
    display: flex;
    align-items: center;
    gap: 5px;
    &:hover { color: ${(props) => props.theme.colors.text.default || '#374151'}; }
    &.active { color: #6366f1; border-bottom-color: #6366f1; }
  }
  .tab-badge {
    font-size: 9px; font-weight: 700; padding: 1px 5px;
    border-radius: 8px; background: #e0e7ff; color: #4338ca;
  }
  .config-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
  .config-close-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    padding: 3px;
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    cursor: pointer;
    &:hover { color: #ef4444; background: #fee2e2; }
  }

  /* ── Shared form elements ── */
  label.lbl {
    display: block;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    margin-bottom: 4px;
  }
  .finput {
    width: 100%;
    padding: 5px 8px;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 5px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    color: ${(props) => props.theme.colors.text.default || '#374151'};
    outline: none;
    &:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
  }
  .fselect {
    width: 100%;
    padding: 5px 8px;
    font-size: 11px;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 5px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    color: ${(props) => props.theme.colors.text.default || '#374151'};
    outline: none;
    cursor: pointer;
  }
  .mapping-card {
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 8px;
    padding: 12px;
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    position: relative;
    &:hover .del-btn { opacity: 1; }
  }
  .del-btn {
    position: absolute; right: -8px; top: -8px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #ef4444; color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; cursor: pointer;
    opacity: 0; transition: opacity 0.15s;
  }
  .mapping-grid {
    display: grid;
    grid-template-columns: 1fr 20px 1fr;
    gap: 8px;
    align-items: start;
  }
  .arrow-col {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 22px;
    color: #9ca3af;
    font-size: 14px;
  }
  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: #6366f1;
    padding: 6px 10px;
    border: 1.5px dashed #a5b4fc;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.12s;
    &:hover { background: #eef2ff; border-color: #6366f1; }
  }
  .empty-hint {
    text-align: center;
    padding: 24px 16px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    border: 1.5px dashed ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 8px;
    font-style: italic;
    line-height: 1.6;
    margin-bottom: 12px;
  }
  .info-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 8px;
    overflow: hidden;
    font-size: 11px;
    td {
      padding: 7px 10px;
      border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
      &:first-child { font-weight: 700; color: ${(props) => props.theme.colors.text.muted || '#9ca3af'}; width: 90px; }
      &:last-child { font-family: 'SF Mono','Fira Code',monospace; word-break: break-all; color: ${(props) => props.theme.colors.text.default || '#374151'}; }
    }
    tr:last-child td { border-bottom: none; }
  }

  .upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.15s ease;
    flex: 0 0 auto;

    &:hover {
      color: ${(props) => props.theme.colors.text.default || '#111827'};
    }
  }

  .value-cell {
    width: 100%;
    display: flex;
    align-items: center;

    .flex-1 {
      min-width: 0;
    }
  }

  .section-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    margin-bottom: 8px; margin-top: 16px;
    &:first-child { margin-top: 0; }
  }
  .empty-panel {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    text-align: center; padding: 40px; gap: 12px;
    .ep-icon { font-size: 36px; opacity: 0.25; }
    p { font-size: 12px; max-width: 240px; line-height: 1.6; }
  }

  /* ── Directory Tree ── */
  .dir-folder {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 2px;
  }
  
  /* FLOW method badge */
  .method-badge.FLOW {
    background: #6366f1;
  }

  /* ── Subflow Details Panel ── */
  .subflow-details-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
  }
  .subflow-steps-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    margin-bottom: 12px;
  }
  .subflow-steps-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .subflow-step-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 8px;
  }
  .subflow-step-num {
    font-size: 11px;
    font-weight: 700;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    width: 16px;
    text-align: right;
  }
  .subflow-step-name-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .subflow-step-name {
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.default || '#111827'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subflow-step-path {
    font-size: 10px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    font-family: 'SF Mono', 'Fira Code', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
  }

  /* Reset button style */
  .config-reset-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
    background: transparent;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 4px;
    padding: 3px 8px;
    cursor: pointer;
    transition: all 0.1s;
    user-select: none;
    &:hover {
      background: ${(props) => props.theme.colors.bg.default || '#f3f4f6'};
      color: ${(props) => props.theme.colors.text.default || '#111827'};
      border-color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    }
  }

  /* ── Runner View ── */
  .runner-container {
    display: flex;
    flex-direction: row;
    flex: 1;
    height: 100%;
    overflow: hidden;
  }
  .runner-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    flex-shrink: 0;
  }
  .runner-filters {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .filter-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    margin-right: 4px;
  }
  .filter-btn {
    font-size: 10px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    transition: all 0.1s;
    display: flex;
    align-items: center;
    gap: 4px;
    &:hover {
      background: ${(props) => props.theme.colors.bg.hover || '#f3f4f6'};
    }
    &.active {
      background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
      border-color: ${(props) => props.theme.colors.border || '#e5e7eb'};
      color: ${(props) => props.theme.colors.text.default || '#111827'};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
  }
  .filter-count {
    font-size: 9px;
    font-weight: 700;
    background: ${(props) => props.theme.colors.bg.default || '#f3f4f6'};
    padding: 0px 4px;
    border-radius: 9999px;
    color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
  }
  .runner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .runner-action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    color: ${(props) => props.theme.colors.text.default || '#111827'};
    cursor: pointer;
    transition: all 0.1s;
    &:hover:not(:disabled) {
      background: ${(props) => props.theme.colors.bg.hover || '#f9fafb'};
    }
    &.btn-ghost {
      border-color: transparent;
      background: transparent;
      color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
      &:hover {
        background: ${(props) => props.theme.colors.bg.hover || '#f3f4f6'};
      }
    }
  }

  .runner-split-pane {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .runner-left-panel {
    width: 380px;
    flex: 0 0 380px;
    border-right: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .runner-left-header {
    display: flex;
    align-items: center;
    padding: 0 16px;
    height: 42px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    flex-shrink: 0;
  }
  .runner-left-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .runner-step-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .runner-step-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    height: 38px;
    cursor: pointer;
    border-left: 3px solid transparent;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#f3f4f6'};
    transition: all 0.1s;
    &:hover {
      background: ${(props) => props.theme.colors.bg.hover || '#f8fafc'};
    }
    &.selected {
      background: ${(props) => props.theme.colors.bg.hover || '#f0f7ff'};
      border-left-color: #6366f1;
    }
    .status-icon {
      width: 16px;
      display: flex;
      justify-content: center;
      flex-shrink: 0;
    }
    .skipped-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: #9ca3af;
    }
    .pending-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: #d1d5db;
    }
    .runner-step-num {
      font-size: 11px;
      font-weight: 700;
      color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
      min-width: 14px;
      text-align: right;
      flex-shrink: 0;
    }
    .step-name {
      font-size: 13px;
      font-weight: 500;
      color: ${(props) => props.theme.colors.text.default || '#374151'};
    }
    .status-code {
      font-size: 10px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
      flex-shrink: 0;
      &.success {
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      &.fail {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
    }
    .tree-connector {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      border-left: 1.5px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
      pointer-events: none;
      &.last {
        height: 50%;
        width: 10px;
        border-left: 1.5px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
        border-bottom: 1.5px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
        border-bottom-left-radius: 4px;
      }
    }
  }

  .runner-flow-group {
    position: relative;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#f3f4f6'};
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    padding-top: 4px;
    padding-bottom: 4px;
    .flow-group-label {
      color: #6366f1;
      font-weight: 600;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 0;
    }
    .tree-connector {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      border-left: 1.5px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
      pointer-events: none;
      &.last {
        height: 50%;
        width: 10px;
        border-left: 1.5px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
        border-bottom: 1.5px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
        border-bottom-left-radius: 4px;
      }
    }
  }

  .runner-step-tests {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 2px;
    margin-bottom: 8px;
  }
  .test-result-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    .test-status-icon {
      font-weight: 700;
    }
    &.pass {
      color: #16a34a;
    }
    &.fail {
      color: #dc2626;
    }
  }

  .runner-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    overflow: hidden;
  }

  /* ── Runner Detail View ── */
  .runner-detail-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
  .trace-header {
    display: flex;
    flex-direction: column;
    padding: 14px 20px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.panel || '#ffffff'};
    flex-shrink: 0;
    gap: 6px;
  }
  .trace-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .trace-name {
    font-size: 13px;
    font-weight: 700;
    color: ${(props) => props.theme.colors.text.default || '#111827'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }
  .trace-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    flex-shrink: 0;
  }
  .status-tag {
    font-weight: 700;
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 4px;
    background: ${(props) => props.theme.colors.bg.default || '#f3f4f6'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    &.success {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.2);
    }
    &.fail {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
    }
  }
  .meta-item {
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .trace-detail-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
  .trace-detail-header {
    padding: 16px;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    flex-shrink: 0;
    .trace-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .trace-title {
      font-size: 13px;
      font-weight: 700;
      color: ${(props) => props.theme.colors.text.default || '#111827'};
    }
    .trace-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
    }
    .status-tag {
      font-weight: 700;
      &.success { color: #16a34a; }
      &.fail { color: #dc2626; }
    }
    .meta-item {
      color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
      font-variant-numeric: tabular-nums;
    }
  }

  .trace-tabs {
    display: flex;
    border-bottom: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    padding: 0 16px;
    flex-shrink: 0;
  }
  .trace-tab {
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.1s;
    &:hover {
      color: ${(props) => props.theme.colors.text.default || '#111827'};
    }
    &.active {
      color: #6366f1;
      border-bottom-color: #6366f1;
    }
  }

  .trace-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .response-pre {
    padding: 12px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 6px;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 100%;
    color: ${(props) => props.theme.colors.text.default || '#374151'};
  }
  .headers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    th, td {
      padding: 6px 12px;
      text-align: left;
      border-bottom: 1px solid ${(props) => props.theme.colors.border || '#f3f4f6'};
    }
    th {
      font-weight: 700;
      color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
      background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    }
    td {
      font-family: 'SF Mono', 'Fira Code', monospace;
      color: ${(props) => props.theme.colors.text.default || '#374151'};
      word-break: break-all;
    }
  }
  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 11px;
  }
  .timeline-item {
    padding: 8px 12px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 6px;
    strong {
      color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
      margin-right: 6px;
    }
  }
  .tests-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .test-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11px;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid;
    .icon {
      font-weight: 700;
    }
    .description {
      font-weight: 600;
    }
    .error {
      font-size: 10px;
      font-family: monospace;
      margin-top: 4px;
    }
    &.pass {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #16a34a;
    }
    &.fail {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }
  }
  .no-data {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.muted || '#9ca3af'};
    text-align: center;
    padding: 40px;
    font-style: italic;
  }

  /* Request tab style */
  .request-pane {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .request-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: ${(props) => props.theme.colors.text.muted || '#6b7280'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
  .url-pre {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 6px;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    overflow-x: auto;
    margin: 0;
    .url-text {
      color: ${(props) => props.theme.colors.text.default || '#374151'};
    }
  }
  .method-badge-small {
    font-size: 9px;
    font-weight: 700;
    color: white;
    padding: 2px 7px;
    border-radius: 4px;
    min-width: 42px;
    text-align: center;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .body-pre {
    padding: 12px;
    background: ${(props) => props.theme.colors.bg.default || '#f9fafb'};
    border: 1px solid ${(props) => props.theme.colors.border || '#e5e7eb'};
    border-radius: 6px;
    font-size: 11px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    color: ${(props) => props.theme.colors.text.default || '#374151'};
    margin: 0;
  }
`;

export default StyledWrapper;
