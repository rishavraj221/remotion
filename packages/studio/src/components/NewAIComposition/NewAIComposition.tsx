import React, { useCallback, useContext, useState } from 'react';
import { ModalsContext } from '../../state/modals';
import { ModalContainer } from '../ModalContainer';
import { ModalHeader } from '../ModalHeader';
import { ModalFooterContainer } from '../ModalFooter';
import { ModalButton } from '../ModalButton';
import { NewCompDuration } from '../NewComposition/NewCompDuration';
import { INPUT_BACKGROUND, TEXT_COLOR } from '../../helpers/colors';
import { Spacing } from '../layout';
import { ValidationMessage } from '../NewComposition/ValidationMessage';

const content: React.CSSProperties = {
  padding: 12,
  paddingRight: 12,
  flex: 1,
  fontSize: 13,
  minWidth: 500,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: INPUT_BACKGROUND,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  color: TEXT_COLOR,
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
};

const label: React.CSSProperties = {
  fontSize: 13,
  color: 'white',
  marginBottom: 8,
};

const inputContainer: React.CSSProperties = {
  marginBottom: 16,
};

export const NewAIComposition: React.FC = () => {
  const { setSelectedModal } = useContext(ModalsContext);
  const [name, setName] = useState('');
  const [durationInFrames, setDurationInFrames] = useState(150); // 5 seconds at 30fps
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onQuit = useCallback(() => {
    setSelectedModal(null);
    setName('');
    setDurationInFrames(150);
    setError(null);
  }, [setSelectedModal]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a composition name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Connect to WebSocket and create composition
      const ws = new WebSocket('ws://localhost:3000/ai-ws');

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'create-composition',
            name: name.trim(),
            durationInFrames,
            fps: 30,
            width: 1920,
            height: 1080,
          }));

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data.toString());
              if (data.type === 'composition-created') {
                resolve();
                ws.close();
                onQuit();
              } else if (data.type === 'error') {
                reject(new Error(data.content || 'Failed to create composition'));
              }
            } catch (err) {
              reject(err);
            }
          };

          ws.onerror = () => {
            reject(new Error('Failed to connect to server'));
            ws.close();
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            reject(new Error('Request timed out'));
            ws.close();
          }, 5000);
        };

        ws.onerror = () => {
          reject(new Error('Failed to connect to server'));
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create composition');
      setIsCreating(false);
    }
  }, [name, durationInFrames, onQuit]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && name.trim() && !isCreating) {
        handleCreate();
      }
    },
    [name, isCreating, handleCreate],
  );

  return (
    <ModalContainer onOutsideClick={onQuit} onEscape={onQuit}>
      <ModalHeader title="New AI Composition" onClose={onQuit} />
      <div style={content}>
        <div style={inputContainer}>
          <div style={label}>Composition Name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter composition name..."
            style={inputStyle}
            autoFocus
            disabled={isCreating}
          />
        </div>
        <NewCompDuration
          durationInFrames={durationInFrames}
          setDurationInFrames={setDurationInFrames}
        />
        {error && (
          <>
            <Spacing y={1} block />
            <ValidationMessage
              align="flex-start"
              message={error}
              type="error"
            />
          </>
        )}
      </div>
      <ModalFooterContainer>
        <ModalButton
          disabled={!name.trim() || isCreating}
          onClick={handleCreate}
        >
          {isCreating ? 'Creating...' : 'Create'}
        </ModalButton>
      </ModalFooterContainer>
    </ModalContainer>
  );
};

