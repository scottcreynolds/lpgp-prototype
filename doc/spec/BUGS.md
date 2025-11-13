# Current Bugs to Fix

* Fixed: Contracts table caused hydration errors due to invalid DOM nesting.
 	* Symptom: Console warnings like: In HTML, thead cannot be a child of div and table cannot contain a nested div.
 	* Root cause: Table.ScrollArea (renders a div) was placed inside Table.Root (renders a table), producing table > div > thead/tbody which is invalid.
 	* Fix: Wrap Table.Root with Table.ScrollArea instead of nesting ScrollArea inside Root. See `src/components/ContractsListView.tsx`.
 	* Verification: `pnpm build` completes without hydration warnings in this area.
