import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CompositionMetadata {
	id: string;
	name: string;
	filePath: string;
	width: number;
	height: number;
	fps: number;
	durationInFrames: number;
	createdAt: number;
	updatedAt: number;
	chatHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>;
}

const COMPOSITIONS_METADATA_FILE = 'compositions-metadata.json';

export class CompositionManager {
	private compositionsPath: string;
	private metadataPath: string;

	constructor(projectRoot: string) {
		this.compositionsPath = projectRoot;
		this.metadataPath = path.join(projectRoot, COMPOSITIONS_METADATA_FILE);
		this.ensureMetadataFile();
	}

	private ensureMetadataFile() {
		if (!fs.existsSync(this.metadataPath)) {
			this.saveMetadata([]);
		}
	}

	private loadMetadata(): CompositionMetadata[] {
		try {
			const content = fs.readFileSync(this.metadataPath, 'utf-8');
			return JSON.parse(content);
		} catch (error) {
			console.error('Error loading metadata:', error);
			return [];
		}
	}

	private saveMetadata(metadata: CompositionMetadata[]) {
		fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
	}

	getAllCompositions(): CompositionMetadata[] {
		return this.loadMetadata();
	}

	getComposition(id: string): CompositionMetadata | null {
		const metadata = this.loadMetadata();
		return metadata.find((c) => c.id === id) || null;
	}

	createComposition(name: string, options?: {
		width?: number;
		height?: number;
		fps?: number;
		durationInFrames?: number;
	}): CompositionMetadata {
		const metadata = this.loadMetadata();
		
		// Sanitize name to create a valid ID (lowercase, replace spaces/special chars with hyphens)
		const sanitizedName = name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'composition';
		
		const id = sanitizedName;
		
		// Check if composition with this ID already exists
		if (metadata.some(c => c.id === id)) {
			throw new Error(`A composition with the name "${name}" already exists. Please choose a different name.`);
		}
		
		const fileName = `composition-${id}.tsx`;

		const composition: CompositionMetadata = {
			id,
			name,
			filePath: fileName, // Store relative path
			width: options?.width ?? 1920,
			height: options?.height ?? 1080,
			fps: options?.fps ?? 30,
			durationInFrames: options?.durationInFrames ?? 150,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			chatHistory: [],
		};

		// Create blank component file
		const blankCode = this.generateBlankComponent();
		fs.writeFileSync(path.resolve(this.compositionsPath, fileName), blankCode, 'utf-8');

		// Save metadata
		metadata.push(composition);
		this.saveMetadata(metadata);

		console.log(`✅ Created composition: ${id} (${name})`);
		return composition;
	}

	updateComposition(id: string, updates: Partial<Pick<CompositionMetadata, 'name' | 'width' | 'height' | 'fps' | 'durationInFrames'>>): CompositionMetadata | null {
		const metadata = this.loadMetadata();
		const index = metadata.findIndex((c) => c.id === id);
		
		if (index === -1) {
			return null;
		}

		metadata[index] = {
			...metadata[index],
			...updates,
			updatedAt: Date.now(),
		};

		this.saveMetadata(metadata);
		return metadata[index];
	}

	getCompositionCode(id: string): string | null {
		const composition = this.getComposition(id);
		if (!composition) {
			return null;
		}

		const filePath = path.resolve(this.compositionsPath, composition.filePath);
		try {
			return fs.readFileSync(filePath, 'utf-8');
		} catch (error) {
			console.error('Error reading composition code:', error);
			return null;
		}
	}

	updateCompositionCode(id: string, code: string): boolean {
		const composition = this.getComposition(id);
		if (!composition) {
			return false;
		}

		const filePath = path.resolve(this.compositionsPath, composition.filePath);
		try {
			fs.writeFileSync(filePath, code, 'utf-8');
			
			// Update metadata
			const metadata = this.loadMetadata();
			const index = metadata.findIndex((c) => c.id === id);
			if (index !== -1) {
				metadata[index].updatedAt = Date.now();
				this.saveMetadata(metadata);
			}
			
			return true;
		} catch (error) {
			console.error('Error updating composition code:', error);
			return false;
		}
	}

	addChatMessage(id: string, role: 'user' | 'assistant' | 'system', content: string): boolean {
		const metadata = this.loadMetadata();
		const index = metadata.findIndex((c) => c.id === id);
		
		if (index === -1) {
			return false;
		}

		metadata[index].chatHistory.push({
			role,
			content,
			timestamp: Date.now(),
		});

		this.saveMetadata(metadata);
		return true;
	}

	getChatHistory(id: string): CompositionMetadata['chatHistory'] {
		const composition = this.getComposition(id);
		return composition?.chatHistory || [];
	}

	deleteComposition(id: string, deleteAssets?: (compositionId: string) => void): boolean {
		const metadata = this.loadMetadata();
		const index = metadata.findIndex((c) => c.id === id);
		
		if (index === -1) {
			return false;
		}

		const composition = metadata[index];
		
		// Delete file
		try {
			const filePath = path.resolve(this.compositionsPath, composition.filePath);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		} catch (error) {
			console.error('Error deleting composition file:', error);
		}

		// Delete associated assets if callback provided
		if (deleteAssets) {
			deleteAssets(id);
		}

		// Remove from metadata
		metadata.splice(index, 1);
		this.saveMetadata(metadata);

		return true;
	}

	renameComposition(id: string, newName: string): CompositionMetadata | null {
		const metadata = this.loadMetadata();
		const index = metadata.findIndex((c) => c.id === id);
		
		if (index === -1) {
			return null;
		}

		// Sanitize new name to create a valid ID
		const sanitizedName = newName
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'composition';
		
		const newId = sanitizedName;
		
		// Check if new ID already exists (and it's not the same composition)
		if (newId !== id && metadata.some(c => c.id === newId)) {
			throw new Error(`A composition with the name "${newName}" already exists. Please choose a different name.`);
		}

		const oldComposition = metadata[index];
		
		// Rename file if ID changed
		if (newId !== id) {
			const oldFilePath = path.resolve(this.compositionsPath, oldComposition.filePath);
			const newFileName = `composition-${newId}.tsx`;
			const newFilePath = path.resolve(this.compositionsPath, newFileName);
			
			try {
				if (fs.existsSync(oldFilePath)) {
					const fileContent = fs.readFileSync(oldFilePath, 'utf-8');
					fs.writeFileSync(newFilePath, fileContent, 'utf-8');
					fs.unlinkSync(oldFilePath);
				}
			} catch (error) {
				console.error('Error renaming composition file:', error);
				throw error;
			}
			
			// Update metadata
			metadata[index] = {
				...oldComposition,
				id: newId,
				name: newName,
				filePath: newFileName,
				updatedAt: Date.now(),
			};
		} else {
			// Just update the name if ID didn't change
			metadata[index] = {
				...oldComposition,
				name: newName,
				updatedAt: Date.now(),
			};
		}

		this.saveMetadata(metadata);
		return metadata[index];
	}

	duplicateComposition(id: string, newName: string, options?: {
		width?: number;
		height?: number;
		fps?: number;
		durationInFrames?: number;
		duplicateAssets?: (sourceCompositionId: string, targetCompositionId: string) => void;
	}): CompositionMetadata | null {
		const metadata = this.loadMetadata();
		const original = metadata.find((c) => c.id === id);
		
		if (!original) {
			return null;
		}

		// Sanitize new name to create a valid ID
		const sanitizedName = newName
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'composition';
		
		const newId = sanitizedName;
		
		// Check if new ID already exists
		if (metadata.some(c => c.id === newId)) {
			throw new Error(`A composition with the name "${newName}" already exists. Please choose a different name.`);
		}

		// Read original file content
		const originalFilePath = path.resolve(this.compositionsPath, original.filePath);
		let fileContent: string;
		try {
			fileContent = fs.readFileSync(originalFilePath, 'utf-8');
		} catch (error) {
			console.error('Error reading original composition file:', error);
			throw error;
		}

		// Create new file
		const newFileName = `composition-${newId}.tsx`;
		const newFilePath = path.resolve(this.compositionsPath, newFileName);
		fs.writeFileSync(newFilePath, fileContent, 'utf-8');

		// Create new metadata entry
		const newComposition: CompositionMetadata = {
			id: newId,
			name: newName,
			filePath: newFileName,
			width: options?.width ?? original.width,
			height: options?.height ?? original.height,
			fps: options?.fps ?? original.fps,
			durationInFrames: options?.durationInFrames ?? original.durationInFrames,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			chatHistory: [], // Start with empty chat history
		};

		metadata.push(newComposition);
		this.saveMetadata(metadata);

		// Duplicate associated assets if callback provided
		if (options?.duplicateAssets) {
			options.duplicateAssets(id, newId);
		}

		return newComposition;
	}

	private generateBlankComponent(): string {
		return `import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * Blank AI Composition
 * Start editing with your prompts!
 */
export const AIGeneratedComponent: React.FC = () => {
	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#ffffff',
				justifyContent: 'center',
				alignItems: 'center'
			}}
		>
		</AbsoluteFill>
	);
};

export default AIGeneratedComponent;
`;
	}
}

