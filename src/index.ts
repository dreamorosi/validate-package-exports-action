import core from '@actions/core';
import github from '@actions/github';
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
	const octo = github.getOctokit(core.getInput('token', { required: true }));

	const res = await validatePackageExports(inputFiles);

	if (res === null) {
		octo.rest.checks.create({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			name: 'My Check',
			head_sha: github.context.sha,
			status: 'completed',
			conclusion: 'success',
		});

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

		errors.push({
			path: packagePath,
			start_line: lineNumber,
			end_line: lineNumber,
			annotation_level: 'failure',
			message: `${name}: ${message} in ${subpath}`,
		});
	}

	octo.rest.checks.create({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		name: 'My Check',
		head_sha: github.context.sha,
		status: 'completed',
		conclusion: 'failure',
		output: {
			title: 'Error',
			summary: 'An error occurred',
			// @ts-expect-error
			annotations: errors,
		},
	});
} catch (error) {
	if (error instanceof Error) {
		core.setFailed(error.message);
	}
	core.setFailed('Unknown error');
}
