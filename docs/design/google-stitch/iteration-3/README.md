\# PocketFlow Reports — Google Stitch Iteration 3



\## Status



Visual reference for Reports implementation.



These files are not production-ready React components and must not be copied

directly into frontend/src.



\## Primary visual reference



Use:



\- screenshots/reports-current-populated.png

\- raw-export/reports-current-populated.html



as the main visual direction.



\## Supporting states



\- reports-current-empty.\*

\- reports-historical-populated.\*



These are state references only. Current, historical, and empty reports must

share one canonical React layout.



\## Source-of-truth priority



When requirements conflict, follow this priority:



1\. REPORTS\_IMPLEMENTATION\_SPEC.md

2\. Existing PocketFlow application behavior and design system

3\. Google Stitch screenshots

4\. Google Stitch raw HTML



\## Do not copy from Stitch



Do not copy:



\- external CDN dependencies;

\- remote fonts or images;

\- Stitch avatar/header;

\- visibility button;

\- generated BottomNav;

\- English navigation labels;

\- hardcoded financial values;

\- static chart percentages;

\- global scrollbar hiding;

\- unsupported Tailwind tokens.



Use the existing PocketFlow AppShell, BottomNav, components, routes, stores,

and design tokens.

