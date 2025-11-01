import * as fs from 'node:fs';
import * as path from 'node:path';
import { BundlerInternals } from '@remotion/bundler';

export interface CodeError {
	message: string;
	line?: number;
	column?: number;
	file?: string;
}

/**
 * Validates TypeScript/TSX code for syntax and type errors using esbuild
 */
export async function validateCode(
	code: string,
	filePath: string,
	tsconfigPath?: string,
): Promise<{ valid: boolean; errors: CodeError[] }> {
	const tempFile = path.join(path.dirname(filePath), `.__temp_${path.basename(filePath)}`);
	
	try {
		// Write code to temp file
		fs.writeFileSync(tempFile, code, 'utf-8');

		// Use esbuild to check for errors
		// We bundle to check for errors, but use external packages to avoid bundling dependencies
		const result = await BundlerInternals.esbuild.build({
			platform: 'node',
			target: 'node16',
			bundle: true, // Bundle to catch import and dependency errors
			entryPoints: [tempFile],
			tsconfig: tsconfigPath,
			absWorkingDir: path.dirname(filePath),
			write: false,
			logLevel: 'silent',
			packages: 'external', // Don't bundle node_modules, just check imports exist
		});

		// Clean up temp file
		if (fs.existsSync(tempFile)) {
			fs.unlinkSync(tempFile);
		}

		if (result.errors.length > 0) {
			const errors: CodeError[] = result.errors.map((err) => {
				// Extract line and column from location if available
				const line = err.location?.line;
				const column = err.location?.column;
				
				return {
					message: err.text,
					line,
					column,
					file: err.location?.file || filePath,
				};
			});

			return {
				valid: false,
				errors,
			};
		}

		return {
			valid: true,
			errors: [],
		};
	} catch (error) {
		// Clean up temp file in case of exception
		if (fs.existsSync(tempFile)) {
			try {
				fs.unlinkSync(tempFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// If esbuild throws an error, it's likely a parsing issue
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			valid: false,
			errors: [
				{
					message: errorMessage,
					file: filePath,
				},
			],
		};
	}
}

/**
 * Formats errors into a readable string for LLM
 */
export function formatErrorsForLLM(errors: CodeError[]): string {
	if (errors.length === 0) {
		return 'No errors found.';
	}

	const errorMessages = errors.map((err, index) => {
		const location = err.line !== undefined 
			? `Line ${err.line}${err.column !== undefined ? `, Column ${err.column}` : ''}`
			: '';
		
		return `${index + 1}. ${location ? `[${location}] ` : ''}${err.message}`;
	});

	return `Found ${errors.length} error(s):\n${errorMessages.join('\n')}`;
}

