import { execa, type ExecaError } from 'execa';
import core from '@actions/core';

function assertExecaError(error: unknown): asserts error is ExecaError {
	if (
		!(error instanceof Error) ||
		!('stdout' in error && 'stderr' in error && 'exitCode' in error)
	) {
		throw error;
	}
}

type PackageExportsError = {
	code: number;
	entryPoint: {
		condition: string;
		itemPath: string[];
		packagePath: string;
		subpath: string;
	};
	message: string;
	name: string;
};

export async function validatePackageExports(
	input: string
): Promise<PackageExportsError[] | null> {
	try {
		await execa('npx', [
			'validate-package-exports',
			'--check',
			'--verify',
			'--json',
			input,
		]);

		return null;
	} catch (error) {
		assertExecaError(error);
		const originalError = error;
		try {
			return JSON.parse(error.stdout);
		} catch (error) {
			core.debug(JSON.stringify(originalError, null, 2));
			throw new Error(`Failed to parse JSON: ${error}`, { cause: error });
		}
	}
}
