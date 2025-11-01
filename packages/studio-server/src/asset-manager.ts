import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AssetMetadata {
	id: string;
	filename: string;
	originalFilename: string;
	filePath: string;
	mimeType: string;
	size: number;
	tags: string[];
	compositionId?: string;
	uploadedAt: number;
	description?: string;
}

const ASSETS_METADATA_FILE = 'assets-metadata.json';
const ASSETS_DIR = 'ai-projects-assets';

export class AssetManager {
	private assetsPath: string;
	private metadataPath: string;
	private projectRoot: string;
	private publicAssetsPath: string;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
		// Store assets in public folder so they're accessible via staticFile
		// public folder is at packages/example/public, projectRoot is at packages/example/src/ai-projects
		const publicRoot = path.resolve(projectRoot, '../../public');
		this.publicAssetsPath = path.join(publicRoot, ASSETS_DIR);
		this.assetsPath = path.join(projectRoot, ASSETS_DIR); // Also keep a copy in ai-projects for metadata
		this.metadataPath = path.join(projectRoot, ASSETS_METADATA_FILE);
		this.ensureAssetsDirectory();
		this.ensureMetadataFile();
	}

	private ensureAssetsDirectory() {
		// Ensure both directories exist
		if (!fs.existsSync(this.publicAssetsPath)) {
			fs.mkdirSync(this.publicAssetsPath, { recursive: true });
		}
		if (!fs.existsSync(this.assetsPath)) {
			fs.mkdirSync(this.assetsPath, { recursive: true });
		}
	}

	private ensureMetadataFile() {
		if (!fs.existsSync(this.metadataPath)) {
			this.saveMetadata([]);
		}
	}

	private loadMetadata(): AssetMetadata[] {
		try {
			const content = fs.readFileSync(this.metadataPath, 'utf-8');
			return JSON.parse(content);
		} catch (error) {
			console.error('Error loading asset metadata:', error);
			return [];
		}
	}

	private saveMetadata(metadata: AssetMetadata[]) {
		fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
	}

	/**
	 * Upload an asset file
	 */
	async uploadAsset(
		buffer: Buffer,
		filename: string,
		mimeType: string,
		options?: {
			tags?: string[];
			compositionId?: string;
			description?: string;
		}
	): Promise<AssetMetadata> {
		if (!options?.compositionId) {
			throw new Error('compositionId is required for asset upload');
		}

		// Generate unique filename to avoid conflicts
		const ext = path.extname(filename);
		const baseName = path.basename(filename, ext);
		const timestamp = Date.now();
		const uniqueFilename = `${baseName}-${timestamp}${ext}`;
		
		// Store in composition-specific folder
		const compositionAssetsDir = path.join(this.publicAssetsPath, options.compositionId);
		if (!fs.existsSync(compositionAssetsDir)) {
			fs.mkdirSync(compositionAssetsDir, { recursive: true });
		}
		
		const publicFilePath = path.join(compositionAssetsDir, uniqueFilename);
		// Convert Buffer to Uint8Array for Bun compatibility
		const bufferData = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
		fs.writeFileSync(publicFilePath, bufferData);

		// Create metadata
		const assetId = `asset-${timestamp}`;
		// File path relative to public folder for use with staticFile()
		const publicRelativePath = path.join(ASSETS_DIR, options.compositionId, uniqueFilename);
		const metadata: AssetMetadata = {
			id: assetId,
			filename: uniqueFilename,
			originalFilename: filename,
			filePath: publicRelativePath, // Path for staticFile() usage
			mimeType,
			size: buffer.length,
			tags: options?.tags || [],
			compositionId: options.compositionId,
			uploadedAt: timestamp,
			description: options?.description,
		};

		// Save metadata
		const allMetadata = this.loadMetadata();
		allMetadata.push(metadata);
		this.saveMetadata(allMetadata);

		console.log(`✅ Uploaded asset: ${uniqueFilename} (${assetId}) to composition ${options.compositionId}`);
		return metadata;
	}

	/**
	 * Get asset by ID
	 */
	getAsset(id: string): AssetMetadata | null {
		const metadata = this.loadMetadata();
		return metadata.find((a) => a.id === id) || null;
	}

	/**
	 * Get all assets
	 */
	getAllAssets(): AssetMetadata[] {
		return this.loadMetadata();
	}

	/**
	 * Get assets by composition ID
	 */
	getAssetsByComposition(compositionId: string): AssetMetadata[] {
		const metadata = this.loadMetadata();
		return metadata.filter((a) => a.compositionId === compositionId);
	}

	/**
	 * Get assets by tags
	 */
	getAssetsByTags(tags: string[]): AssetMetadata[] {
		const metadata = this.loadMetadata();
		return metadata.filter((a) => tags.some((tag) => a.tags.includes(tag)));
	}

	/**
	 * Update asset tags
	 */
	updateAssetTags(id: string, tags: string[]): AssetMetadata | null {
		const metadata = this.loadMetadata();
		const index = metadata.findIndex((a) => a.id === id);
		
		if (index === -1) {
			return null;
		}

		metadata[index].tags = tags;
		this.saveMetadata(metadata);
		return metadata[index];
	}

	/**
	 * Get asset by file path (relative to public folder)
	 */
	getAssetByFilePath(filePath: string): AssetMetadata | null {
		const metadata = this.loadMetadata();
		// Normalize paths for comparison
		const normalizedPath = filePath.replace(/\\/g, '/');
		return metadata.find((a) => a.filePath.replace(/\\/g, '/') === normalizedPath) || null;
	}

	/**
	 * Delete asset by ID
	 */
	deleteAsset(id: string): boolean {
		const metadata = this.loadMetadata();
		const index = metadata.findIndex((a) => a.id === id);
		
		if (index === -1) {
			return false;
		}

		const asset = metadata[index];
		
		// Delete file from public folder
		try {
			const publicRoot = path.resolve(this.projectRoot, '../../public');
			const filePath = path.join(publicRoot, asset.filePath);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		} catch (error) {
			console.error('Error deleting asset file:', error);
		}

		// Remove from metadata
		metadata.splice(index, 1);
		this.saveMetadata(metadata);

		return true;
	}

	/**
	 * Delete asset by file path (relative to public folder)
	 */
	deleteAssetByFilePath(filePath: string): boolean {
		const asset = this.getAssetByFilePath(filePath);
		if (!asset) {
			return false;
		}
		return this.deleteAsset(asset.id);
	}

	/**
	 * Delete all assets for a composition
	 */
	deleteAssetsByComposition(compositionId: string): boolean {
		const metadata = this.loadMetadata();
		const assetsToDelete = metadata.filter((a) => a.compositionId === compositionId);
		
		if (assetsToDelete.length === 0) {
			return true; // Nothing to delete
		}

		// Delete all files
		const publicRoot = path.resolve(this.projectRoot, '../../public');
		for (const asset of assetsToDelete) {
			try {
				const filePath = path.join(publicRoot, asset.filePath);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			} catch (error) {
				console.error(`Error deleting asset file ${asset.filename}:`, error);
			}
		}

		// Remove from metadata
		const updatedMetadata = metadata.filter((a) => a.compositionId !== compositionId);
		this.saveMetadata(updatedMetadata);

		// Try to delete the composition folder if it's empty
		try {
			const compositionAssetsDir = path.join(this.publicAssetsPath, compositionId);
			if (fs.existsSync(compositionAssetsDir)) {
				const files = fs.readdirSync(compositionAssetsDir);
				if (files.length === 0) {
					fs.rmdirSync(compositionAssetsDir);
				}
			}
		} catch (error) {
			console.error('Error deleting composition assets folder:', error);
		}

		console.log(`✅ Deleted ${assetsToDelete.length} asset(s) for composition ${compositionId}`);
		return true;
	}

	/**
	 * Duplicate assets from one composition to another
	 */
	duplicateAssets(sourceCompositionId: string, targetCompositionId: string): AssetMetadata[] {
		const metadata = this.loadMetadata();
		const sourceAssets = metadata.filter((a) => a.compositionId === sourceCompositionId);
		
		if (sourceAssets.length === 0) {
			return [];
		}

		const publicRoot = path.resolve(this.projectRoot, '../../public');
		const duplicatedAssets: AssetMetadata[] = [];

		// Create target composition folder
		const targetAssetsDir = path.join(this.publicAssetsPath, targetCompositionId);
		if (!fs.existsSync(targetAssetsDir)) {
			fs.mkdirSync(targetAssetsDir, { recursive: true });
		}

		// Copy each asset
		for (const sourceAsset of sourceAssets) {
			try {
				const sourcePath = path.join(publicRoot, sourceAsset.filePath);
				if (!fs.existsSync(sourcePath)) {
					console.warn(`Source asset file not found: ${sourceAsset.filePath}`);
					continue;
				}

				// Create new asset metadata with new ID
				const timestamp = Date.now();
				const newAssetId = `asset-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
				const newFilePath = path.join(ASSETS_DIR, targetCompositionId, sourceAsset.filename);
				const targetPath = path.join(publicRoot, newFilePath);

				// Copy file
				fs.copyFileSync(sourcePath, targetPath);

				// Create new metadata
				const newAsset: AssetMetadata = {
					...sourceAsset,
					id: newAssetId,
					filePath: newFilePath,
					compositionId: targetCompositionId,
					uploadedAt: timestamp,
				};

				metadata.push(newAsset);
				duplicatedAssets.push(newAsset);
			} catch (error) {
				console.error(`Error duplicating asset ${sourceAsset.filename}:`, error);
			}
		}

		// Save updated metadata
		this.saveMetadata(metadata);

		console.log(`✅ Duplicated ${duplicatedAssets.length} asset(s) from ${sourceCompositionId} to ${targetCompositionId}`);
		return duplicatedAssets;
	}

	/**
	 * Get asset file path (for serving)
	 */
	getAssetFilePath(id: string): string | null {
		const asset = this.getAsset(id);
		if (!asset) {
			return null;
		}
		const publicRoot = path.resolve(this.projectRoot, '../../public');
		return path.join(publicRoot, asset.filePath);
	}

	/**
	 * Get asset URL path (relative to public)
	 */
	getAssetUrl(id: string): string | null {
		const asset = this.getAsset(id);
		if (!asset) {
			return null;
		}
		// Return path that can be used with staticFile() in Remotion
		return asset.filePath;
	}
}

