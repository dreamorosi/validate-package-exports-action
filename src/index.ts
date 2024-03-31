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
	/* core.info(fullGreeting); */
	core.setOutput('fullGreeting', 'hi');

	// Get the JSON webhook payload for the event that triggered the workflow
	// const payload = JSON.stringify(github.context.payload, undefined, 2);

	const res = await validatePackageExports(inputFiles);

	if (res === null) {
		core.info('No errors found');
		process.exit(0);
	}

	const packageJsonContents = new Map<string, string>();
	const errors = [];
	for (const error of res) {
		const {
			entryPoint: { packagePath, itemPath, subpath },
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

		core.error(`${name}: ${message} in ${subpath}`, {
			file: packagePath,
			startLine: lineNumber,
		});
	}

	if (errors.length > 0) {
		process.exit(1);
	}
} catch (error) {
	if (error instanceof Error) {
		core.setFailed(error.message);
	}
	core.setFailed('Unknown error');
}
