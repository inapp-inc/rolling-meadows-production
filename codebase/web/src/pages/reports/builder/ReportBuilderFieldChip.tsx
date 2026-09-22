import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../../i18n/I18nContext';

type ReportBuilderFieldChipProps = {
  refKey: string;
  role: string;
  label: string;
  searchText?: string;
  special?: boolean;
  onAssignAxis: (axis: 'x' | 'y', key: string, role: string) => void;
  onPreview: (key: string, role: string) => void;
};

function canAssignFieldToX(fieldKey: string, role: string) {
  return fieldKey !== '__count__' && role !== 'measure';
}

function canAssignFieldToY(fieldKey: string, role: string) {
  return fieldKey === '__count__' || role === 'measure';
}

export function ReportBuilderFieldChip({
  refKey,
  role,
  label,
  searchText,
  special,
  onAssignAxis,
  onPreview,
}: ReportBuilderFieldChipProps) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragOccurredRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const menu = document.querySelector('.rb-field-context-menu');
      if (menu?.contains(target)) return;
      setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('click', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    let top = rect.bottom + window.scrollY + 4;
    let left = rect.left + window.scrollX;
    setMenuPos({ top, left });
    setMenuOpen(true);

    requestAnimationFrame(() => {
      const menu = document.querySelector('.rb-field-context-menu') as HTMLElement | null;
      if (!menu) return;
      const menuRect = menu.getBoundingClientRect();
      if (left + menuRect.width > window.scrollX + window.innerWidth - 8) {
        left = window.scrollX + window.innerWidth - menuRect.width - 8;
      }
      if (top + menuRect.height > window.scrollY + window.innerHeight - 8) {
        top = rect.top + window.scrollY - menuRect.height - 4;
      }
      setMenuPos({ top, left });
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`rb-drag-field${special ? ' rb-drag-field-special' : ''}`}
        draggable
        data-field-key={refKey}
        data-field-role={role}
        data-search={searchText}
        title={t('pages.reportBuilder.clickForMenu')}
        onDragStart={(event) => {
          dragOccurredRef.current = true;
          buttonRef.current?.classList.add('is-dragging');
          event.dataTransfer.setData('text/plain', JSON.stringify({ key: refKey, role }));
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          buttonRef.current?.classList.remove('is-dragging');
          document.querySelectorAll('.rb-axis-drop').forEach((zone) => zone.classList.remove('is-dragover'));
          setTimeout(() => {
            dragOccurredRef.current = false;
          }, 0);
        }}
        onClick={(event) => {
          if (dragOccurredRef.current) {
            dragOccurredRef.current = false;
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          openMenu();
        }}
      >
        <span className="rb-drag-handle" aria-hidden="true">
          ⠿
        </span>
        <span className="rb-drag-label">{label}</span>
      </button>

      {menuOpen
        ? createPortal(
            <div
              className="rb-field-context-menu"
              role="menu"
              style={{ position: 'absolute', top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                className="rb-field-context-item"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onPreview(refKey, role);
                }}
              >
                {t('pages.reportBuilder.fieldContextPreview')}
              </button>
              <button
                type="button"
                className="rb-field-context-item"
                role="menuitem"
                disabled={!canAssignFieldToX(refKey, role)}
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onAssignAxis('x', refKey, role);
                }}
              >
                {t('pages.reportBuilder.fieldContextAssignX')}
              </button>
              <button
                type="button"
                className="rb-field-context-item"
                role="menuitem"
                disabled={!canAssignFieldToY(refKey, role)}
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onAssignAxis('y', refKey, role);
                }}
              >
                {t('pages.reportBuilder.fieldContextAssignY')}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
