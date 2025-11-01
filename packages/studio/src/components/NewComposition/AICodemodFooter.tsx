import type { RecastCodemod } from '@remotion/studio-shared';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ShortcutHint } from '../../error-overlay/remotion-overlay/ShortcutHint';
import { useKeybinding } from '../../helpers/use-keybinding';
import { ModalsContext } from '../../state/modals';
import { ModalButton } from '../ModalButton';
import { showNotification } from '../Notifications/NotificationCenter';
import { applyCodemod, getProjectInfo } from '../RenderQueue/actions';
import { Flex, Row, Spacing } from '../layout';
import type { CodemodStatus } from './DiffPreview';
import { CodemodDiffPreview } from './DiffPreview';
import type { ProjectInfo } from '@remotion/studio-shared';

const UNABLE_TO_CALCULATE_ERROR = 'Unable to calculate the changes needed for this file. Edit the root file manually.';

export const AICodemodFooter: React.FC<{
  readonly valid: boolean;
  readonly codemod: RecastCodemod;
  readonly loadingNotification: React.ReactNode;
  readonly successNotification: React.ReactNode;
  readonly errorNotification: string;
  readonly genericSubmitLabel: string;
  readonly submitLabel: (options: { relativeRootPath: string }) => string;
  readonly onAIFallback?: () => Promise<void>;
}> = ({
  codemod,
  valid,
  loadingNotification,
  successNotification,
  errorNotification,
  genericSubmitLabel,
  submitLabel,
  onAIFallback,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const { setSelectedModal } = useContext(ModalsContext);
    const [codemodStatus, setCanApplyCodemod] = useState<CodemodStatus>({
      type: 'loading',
    });
    const [useAI, setUseAI] = useState(false);
    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);

    useEffect(() => {
      const controller = new AbortController();

      getProjectInfo(controller.signal)
        .then((info) => {
          setProjectInfo(info.projectInfo);
        })
        .catch((err) => {
          showNotification(
            `Could not get project info: ${err.message}`,
            3000,
          );
        });

      return () => {
        controller.abort();
      };
    }, []);

    const getCanApplyCodemod = useCallback(
      async (signal: AbortSignal) => {
        const res = await applyCodemod({
          codemod,
          dryRun: true,
          signal,
        });

        if (res.success) {
          setCanApplyCodemod({ type: 'success', diff: res.diff });
          setUseAI(false);
        } else {
          // Check if it's the specific error that means it's an AI composition
          if (res.reason?.includes(UNABLE_TO_CALCULATE_ERROR)) {
            setUseAI(true);
            // Use empty diff for AI compositions (we don't edit Root.tsx)
            setCanApplyCodemod({
              type: 'success',
              diff: { additions: 0, deletions: 0 },
            });
          } else {
            setCanApplyCodemod({
              type: 'fail',
              error: res.reason,
            });
            setUseAI(false);
          }
        }
      },
      [codemod],
    );

    useEffect(() => {
      const abortController = new AbortController();
      let aborted = false;
      getCanApplyCodemod(abortController.signal)
        .then(() => undefined)
        .catch((err) => {
          if (aborted) {
            return;
          }
          // Don't show error if we're falling back to AI
          if (!err.message?.includes(UNABLE_TO_CALCULATE_ERROR)) {
            showNotification(`Cannot apply changes: ${err.message}`, 3000);
          }
        });

      return () => {
        aborted = true;
        abortController.abort();
      };
    }, [getCanApplyCodemod]);

    const trigger = useCallback(() => {
      setSubmitting(true);
      setSelectedModal(null);
      const notification = showNotification(loadingNotification, null);

      if (useAI && onAIFallback) {
        // Use WebSocket for AI compositions
        onAIFallback()
          .then(() => {
            notification.replaceContent(successNotification, 2000);
          })
          .catch((err) => {
            notification.replaceContent(
              `${errorNotification}: ${err.message}`,
              2000,
            );
          })
          .finally(() => {
            setSubmitting(false);
          });
      } else {
        // Use codemod for regular compositions
        applyCodemod({
          codemod,
          dryRun: false,
          signal: new AbortController().signal,
        })
          .then(() => {
            notification.replaceContent(successNotification, 2000);
          })
          .catch((err) => {
            notification.replaceContent(
              `${errorNotification}: ${err.message}`,
              2000,
            );
          })
          .finally(() => {
            setSubmitting(false);
          });
      }
    }, [
      codemod,
      errorNotification,
      loadingNotification,
      setSelectedModal,
      successNotification,
      useAI,
      onAIFallback,
    ]);

    const disabled =
      !valid ||
      submitting ||
      projectInfo === null ||
      (codemodStatus.type !== 'success' && !useAI);

    const { registerKeybinding } = useKeybinding();

    useEffect(() => {
      if (disabled) {
        return;
      }

      const enter = registerKeybinding({
        callback() {
          trigger();
        },
        commandCtrlKey: true,
        key: 'Enter',
        event: 'keydown',
        preventDefault: true,
        triggerIfInputFieldFocused: true,
        keepRegisteredWhenNotHighestContext: false,
      });
      return () => {
        enter.unregister();
      };
    }, [disabled, registerKeybinding, trigger, valid]);

    return (
      <Row align="center">
        {!useAI && <CodemodDiffPreview status={codemodStatus} />}
        {useAI && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            AI composition - will be updated via WebSocket
          </div>
        )}
        <Flex />
        <Spacing block x={2} />
        <ModalButton onClick={trigger} disabled={disabled}>
          {projectInfo && projectInfo.relativeRootFile && !useAI
            ? submitLabel({ relativeRootPath: projectInfo.relativeRootFile })
            : genericSubmitLabel}
          <ShortcutHint keyToPress="↵" cmdOrCtrl />
        </ModalButton>
      </Row>
    );
  };

