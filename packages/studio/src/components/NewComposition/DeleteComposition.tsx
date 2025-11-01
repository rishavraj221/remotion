import type { RecastCodemod } from '@remotion/studio-shared';
import React, { useCallback, useContext, useMemo } from 'react';
import { inlineCodeSnippet } from '../Menu/styles';
import { ModalFooterContainer } from '../ModalFooter';
import { ModalHeader } from '../ModalHeader';
import {
	ResolveCompositionBeforeModal,
	ResolvedCompositionContext,
} from '../RenderModal/ResolveCompositionBeforeModal';
import { AICodemodFooter } from './AICodemodFooter';
import { DismissableModal } from './DismissableModal';
import { useAIWebSocket } from './useAIWebSocket';

const content: React.CSSProperties = {
	padding: 16,
	fontSize: 14,
	flex: 1,
	minWidth: 500,
};

const DeleteCompositionLoaded: React.FC<{
	readonly compositionId: string;
}> = ({ compositionId }) => {
	const context = useContext(ResolvedCompositionContext);
	if (!context) {
		throw new Error('Resolved composition context');
	}

	const { unresolved } = context;
	const { sendMessage } = useAIWebSocket();

	const codemod: RecastCodemod = useMemo(() => {
		return {
			type: 'delete-composition',
			idToDelete: compositionId,
		};
	}, [compositionId]);

	const onAIFallback = useCallback(async () => {
		await sendMessage({
			type: 'delete-composition',
			compositionId,
		});
	}, [compositionId, sendMessage]);

	const onSubmit: React.FormEventHandler<HTMLFormElement> = useCallback((e) => {
		e.preventDefault();
	}, []);

	return (
		<>
			<ModalHeader title={'Delete composition'} />
			<form onSubmit={onSubmit}>
				<div style={content}>
					Do you want to delete the{' '}
					<code style={inlineCodeSnippet}>
						{unresolved.durationInFrames === 1 ? `<Still>` : '<Composition>'}
					</code>{' '}
					with ID {'"'}
					{unresolved.id}
					{'"'}?
					<br />
					The associated <code style={inlineCodeSnippet}>component</code> will
					remain in your code.
				</div>
				<ModalFooterContainer>
					<AICodemodFooter
						errorNotification={`Could not delete composition`}
						loadingNotification={'Deleting'}
						successNotification={`Deleted ${unresolved.id}`}
						genericSubmitLabel={`Delete`}
						submitLabel={({ relativeRootPath }) =>
							`Delete from ${relativeRootPath}`
						}
						codemod={codemod}
						valid
						onAIFallback={onAIFallback}
					/>
				</ModalFooterContainer>
			</form>
		</>
	);
};

export const DeleteComposition: React.FC<{
	readonly compositionId: string;
}> = ({ compositionId }) => {
	return (
		<DismissableModal>
			<ResolveCompositionBeforeModal compositionId={compositionId}>
				<DeleteCompositionLoaded compositionId={compositionId} />
			</ResolveCompositionBeforeModal>
		</DismissableModal>
	);
};
