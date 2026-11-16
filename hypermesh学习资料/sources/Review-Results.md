---
title: Review Results
source: C:\Users\33536\Desktop\llm_kb\hypermesh学习资料\HyperMesh_2025.1_结果查看教程.pdf
publishedDate: D:20261113092003+00'00'
sourceType: localPdf
---

Review Results
Tutorial Level: Intermediate
In this tutorial, you will analyze and query results.
Before you begin, copy the file(s) used in this tutorial to your working directory.
Analysis_Setup_SOLVED.hm
Analysis_Setup_SOLVED.h3d
In this tutorial, you will:
Analyze results with an .h3d file
Query results
Step 1. Analyze Results
In this step, you will analyze results with a .h3d file.
1. Start HyperMesh.
2. From the menu bar, click File > (and then) Open > (and then) HyperMesh Model.
3. Browse to your working directory, select Analysis_Setup_SOLVED.hm, and click Open.
The model opens in the modeling window.
4. From the Post ribbon, select the Import Results tool from the Result tool group.
Figure 1.
5. Browse and select the Analysis_Setup_SOLVED.h3d file and click Open.
6. From the Post ribbon, select the Contour tool.
Figure 2.
7. In the Contour dialog, enter Element Stresses for Name.
8. For Data Type, select Element Stresses (2D & 3D).
9. For Data Component, verify vonMises is selected.
10. From the guide bar, click Plot.
11. From the Post ribbon, select the Create Contour tool from the Contour tool group.
Figure 3.
12. In the Contour dialog, enter Displacements for Name.
13. For Data Type, select Displacement.
14. For Data Component, select Mag.
15. From the guide bar, click Plot.
Figure 4.

16. From the Post ribbon, select the Deformed tool.
Figure 5.
17. In the Deformed dialog, enter Displacement for Name.
18. For Data Type, verify Displacement is selected.
19. Optional: Define the Uniform Scale.
20. For Undeformed Shape, select Edges.
21. From the guide bar, click Plot.
Figure 6.
Step 2. Query Results
1. From the Post ribbon, select the Tools tool.
Figure 7.
2. In the Results Query and MinMax/Ranking/Envelope dialog, select MinMax/Ranking/Envelope for Report
Mode and click Start.
Figure 8.
3. In the MinMax/Ranking/Envelope dialog, select Static Analysis and Element Stress (2D & 3D).
4. Set the other parameters to match Figure 9 and click Set.
Figure 9.
5. For Datatypes, select Displacement.
6. Set the other parameters to match and click Set.
Figure 10.
7. Optional: Click Settings to edit the export settings of the results.
You may have to modify the CSV separator.
8. For each query, click in the Output File field.
9. Choose a folder location and enter a name.
10. Click Apply.
The reports are generated at the specified location.
11. Open the exported .csv files and review the queried results.
Figure 11.