/**
 * Template utilities for AI-generated Remotion components
 * This file provides helper functions and validation for generated code
 */

export interface AIProjectMetadata {
	name: string;
	timestamp: number;
	prompt: string;
	filename: string;
}

/**
 * Available imports that AI-generated code can safely use
 */
export const SAFE_IMPORTS = [
	'react',
	'remotion',
	'@remotion/shapes',
	'@remotion/layout-utils',
];

/**
 * Dangerous imports that should be blocked
 */
export const BLOCKED_IMPORTS = [
	'fs',
	'child_process',
	'process',
	'path',
	'os',
	'net',
	'http',
	'https',
];

/**
 * Validates that generated code doesn't contain dangerous imports
 */
export function validateCode(code: string): {valid: boolean; error?: string} {
	// Check for blocked imports
	for (const blocked of BLOCKED_IMPORTS) {
		const importPattern = new RegExp(
			`import.*['"]${blocked}['"]|require\\(['"]${blocked}['"]\\)`,
			'i',
		);
		if (importPattern.test(code)) {
			return {
				valid: false,
				error: `Blocked import detected: ${blocked}`,
			};
		}
	}

	// Check for basic structure - must have export default
	if (
		!code.includes('export default') &&
		!code.includes('export const') &&
		!code.includes('export function')
	) {
		return {
			valid: false,
			error: 'Code must export a default component or named export',
		};
	}

	// Check file size (max 50KB)
	if (code.length > 50000) {
		return {
			valid: false,
			error: 'Generated code exceeds maximum size limit (50KB)',
		};
	}

	return {valid: true};
}

/**
 * Template for AI-generated component
 * This provides a starting point for the LLM
 */
export const COMPONENT_TEMPLATE = `import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {Circle, Rect, Triangle} from '@remotion/shapes';

/**
 * AI-Generated Component
 * Prompt: {{PROMPT}}
 * Generated: {{TIMESTAMP}}
 */
export const AIGeneratedComponent: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Your animation code here

	return (
		<AbsoluteFill
			style={{
				backgroundColor: 'white',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			{/* Your content here */}
		</AbsoluteFill>
	);
};

export default AIGeneratedComponent;
`;

/**
 * Common animation patterns that LLM can use
 */
export const ANIMATION_PATTERNS = {
	fadeIn: `const opacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});`,

	slideInFromLeft: `const translateX = interpolate(frame, [0, 30], [-100, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});`,

	scale: `const scale = spring({
		frame,
		fps,
		config: {
			damping: 100,
			stiffness: 200,
			mass: 0.5,
		},
	});`,

	rotate: `const rotation = interpolate(frame, [0, 60], [0, 360]);`,
};

/**
 * Example prompts and their expected outputs
 */
export const EXAMPLE_PROMPTS = [
	{
		prompt: 'Create a video with text "Hello World" that fades in',
		description: 'Simple text fade-in animation',
	},
	{
		prompt: 'Animate a blue circle moving from left to right',
		description: 'Shape animation with movement',
	},
	{
		prompt: 'Show "Welcome" text with a bounce effect',
		description: 'Text animation with spring physics',
	},
	{
		prompt: 'Create a rotating square that changes color',
		description: 'Combined rotation and color animation',
	},
];

