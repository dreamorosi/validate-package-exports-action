import core from '@actions/core';
import github from '@actions/github';

try {
  // `some-input` input defined in action metadata file
  const someInput = core.getInput('whoToGreet', {
    required: true,
    trimWhitespace: true,
  });
  const fullGreeting = `Hello ${someInput}!`;
  core.info(fullGreeting);
  core.setOutput('fullGreeting', fullGreeting);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(error.message);
  }
  core.setFailed('Unknown error');
}
