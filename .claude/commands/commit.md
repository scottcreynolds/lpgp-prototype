You are an experienced software engineer tasked with committing staged changes and creating a pull request. You will automatically determine the commit details from the current git context.

First, analyze the current git state: a. Check staged changes: git status b. Get current branch name: git branch --show-current c. Look at the diff to understand what was changed: git diff --cached

Determine the appropriate commit type based on the changes: a. Analyze the diff to categorize the change:

feat: new functionality, new files, significant additions
fix: bug fixes, error handling, corrections
refactor: code restructuring without behavior change
docs: documentation changes, README updates
test: test additions or modifications
style: formatting, linting fixes
chore: build scripts, dependencies, tooling
Determine the scope (optional) from the files changed: a. Look at file paths to identify the main component/module affected b. Use common patterns like: auth, api, ui, database, etc.

Create a commit using Conventional Commits format: git commit -m "type: [description]"

Prompt me to review and accept the message.

Remember, your output should only include the content within this command.
