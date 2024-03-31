import core from '@actions/core';
import { readFileSync } from 'node:fs';
import { validatePackageExports } from './validatePackageExports.js';

const findLineNumber = (packageJsonContent: string, path: string[]): number => {
	let currentObj = JSON.parse(packageJsonContent);
	let parsedKey = path[0];

	for (const key of path) {
		parsedKey = key;
		if (parsedKey.startsWith('"') && parsedKey.endsWith('"')) {
			parsedKey = parsedKey.slice(1, -1);
		}

		if (
			!currentObj ||
			typeof currentObj !== 'object' ||
			!(parsedKey in currentObj)
		) {
			return -1;
		}

		currentObj = currentObj[parsedKey];
	}

	if (parsedKey === undefined) {
		throw new Error('No key found');
	}

	const packageJsonLines = packageJsonContent.split('\n');
	return packageJsonLines.findIndex((line) => line.includes(currentObj)) + 1;
};

try {
	const inputFiles = core.getInput('inputFiles', {
		required: true,
		trimWhitespace: true,
	});

	const res = await validatePackageExports(inputFiles);

	if (res === null) {
		core.info('No errors found');
		process.exit(0);
	}
	core.info(`Found ${res.length} errors`);

	const packageJsonContents = new Map<string, string>();
	for (const error of res) {
		const {
			entryPoint: { packagePath, itemPath, subpath, condition },
			message,
			name,
		} = error;

		if (!packageJsonContents.has(packagePath)) {
			packageJsonContents.set(packagePath, readFileSync(packagePath, 'utf8'));
		}

		const lineNumber = findLineNumber(
			// biome-ignore lint/style/noNonNullAssertion: we know the packagePath is in the map because we just set it
			packageJsonContents.get(packagePath)!,
			itemPath
		);

		core.error(`${name}: ${message} in ${subpath} "${condition}" export`, {
			file: packagePath,
			startLine: lineNumber,
		});
	}

	core.setFailed(`Found ${res.length} errors in exports`);
} catch (error) {
	if (error instanceof Error) {
		core.setFailed(error.message);
	}
	core.setFailed('Unknown error');
}
