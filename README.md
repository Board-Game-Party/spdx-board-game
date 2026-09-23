The fix about CSV export. Also XLSX..something something. 

It not finish yet. I managed to fix some of it(I fuk up my token real bad)

The fix are at/in the 'Group Sum..', 'Individual Sum...', and 'Pair coverage' pages. The export CSV button is now work like it intended as far as I E2E test it.

The last past(hope so) are two CSV and XLSX export buttons at 'Project Sprint 1' page. I do not touch it yet and I think it had the same problem as the rest.

Cause that cause this problem is from FrontEnd code(Path:...\\spdx-board-game\frontend\src\features\reporting) at line 103(GroupReportView.tsx), 100(IndividualView.tsx), and 129(PairCoverage.tsx)
it use 'window.open()' make the client use normal 'GET request' that bypass the frontend's API. Which mean the request not carry the auth token and so the BackEnd reject the request.

To fix it. Use the 'downloadFile' function form lib. so the request it pass FrontEnd's API. Also add the error handling.

**edit change**
as of now the another two buttons are now fixed!! It did have the same problem and it now fixed.
